package backend

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"script-platform/server/process_manager"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var (
	manager  *process_manager.ScriptManager
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
)

// Helper to resolve paths relative to executable or CWD
func resolvePath(segments ...string) string {
	cwd, _ := os.Getwd()

	// Option 1: Try path relative to CWD
	path1 := filepath.Join(cwd, filepath.Join(segments...))
	if _, err := os.Stat(path1); err == nil {
		return path1
	}

	// Option 2: Try path relative to parent (Legacy Dev Mode where CWD might be server/)
	path2 := filepath.Join(cwd, "..", filepath.Join(segments...))
	if _, err := os.Stat(path2); err == nil {
		return path2
	}

	// Return default (Option 1) even if missing, or handle logic
	return path1
}

// Helper for ADB specifically
func getAdbPath() string {
	adbName := "adb"
	if os.PathSeparator == '\\' {
		adbName = "adb.exe"
	}

	// Check platform-tools/adb (Wails Root or bundled)
	path := resolvePath("platform-tools", adbName)
	return path
}

func StartServer() {
	cwd, _ := os.Getwd()

	// Resolve Core Path
	corePath := resolvePath("core")

	// Check for Sidecar Binary (Prod Mode)
	exeName := "script-engine"
	if os.PathSeparator == '\\' {
		exeName += ".exe"
	}

	sidecarPath := filepath.Join(cwd, exeName) // Sidecar always next to main binary

	var cmdPath, entryScript string

	// Mode Selection
	if _, err := os.Stat(sidecarPath); err == nil {
		// Found Binary -> Release Mode
		fmt.Println("Mode: Release (Using bundled script-engine)")
		cmdPath = sidecarPath
		entryScript = ""
	} else {
		// Not Found -> Dev Mode
		fmt.Println("Mode: Development (Using system python)")
		cmdPath = "python"
		entryScript = "entry.py"
	}

	manager = process_manager.NewScriptManager(corePath, cmdPath, entryScript)

	r := gin.Default()

	// Enable CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Origin, X-Requested-With")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api")
	{
		api.GET("/scripts", listScripts)
		api.POST("/scripts", createScript)
		api.POST("/run", runScript)
		api.POST("/stop", stopScript)
		api.GET("/devices", listDevices)
		api.GET("/scripts/:id/content", getScriptContent)
		api.POST("/scripts/:id/content", saveScriptContent)
		// Existing DELETE for script
		api.DELETE("/scripts/:id", deleteScript)

		// Asset Management
		api.GET("/scripts/:id/assets", listAssets)
		api.POST("/scripts/:id/assets/rename", renameAsset)
		api.DELETE("/scripts/:id/assets/:filename", deleteAsset)
		api.GET("/scripts/:id/assets/:filename/raw", getAssetRaw)

		api.GET("/devices/:id/screenshot", getDeviceScreenshot)
		api.POST("/assets", uploadAsset)
		api.POST("/scripts/:id/assets", uploadAsset)

		// ZIP Import/Export
		api.GET("/scripts/:id/export", exportScript)
		api.POST("/scripts/import", importScript)

		// Rename
		api.POST("/scripts/:id/rename", renameScript)

		// Debug / ADB Management
		api.GET("/adb/status", checkAdbStatus)
		api.POST("/adb/start", startAdb)
		api.POST("/adb/stop", stopAdb)
		api.POST("/adb/command", executeAdbCommand)
	}

	r.GET("/ws/logs/:id", streamLogs)

	port := ":8080"
	fmt.Printf("Server starting on %s\n", port)
	r.Run(port)
}

func listAssets(c *gin.Context) {
	scriptID := c.Param("id")
	assets, err := manager.ListAssets(scriptID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, assets)
}

func renameAsset(c *gin.Context) {
	scriptID := c.Param("id")
	var req struct {
		OldName string `json:"oldName"`
		NewName string `json:"newName"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if err := manager.RenameAsset(scriptID, req.OldName, req.NewName); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func deleteAsset(c *gin.Context) {
	scriptID := c.Param("id")
	filename := c.Param("filename")

	if err := manager.DeleteAsset(scriptID, filename); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func getAssetRaw(c *gin.Context) {
	scriptID := c.Param("id")
	filename := c.Param("filename")

	// Helper to find script path (duplicated logic, should refactor in manager but ok for now)
	scripts, err := manager.ListScripts()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	var scriptPath string
	for _, s := range scripts {
		if s["id"] == scriptID {
			scriptPath = s["path"]
			break
		}
	}

	if scriptPath == "" {
		c.JSON(44, gin.H{"error": "script not found"})
		return
	}

	// scriptPath is relative to Core, e.g. script/custom/foo/foo.py
	// Image is in script/custom/foo/images/filename
	fullScriptPath := filepath.Join(manager.CorePath, scriptPath)
	imagesDir := filepath.Join(filepath.Dir(fullScriptPath), "images")
	imagePath := filepath.Join(imagesDir, filename)

	// Security check
	if filepath.Dir(imagePath) != imagesDir {
		c.JSON(403, gin.H{"error": "Forbidden"})
		return
	}

	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		c.JSON(404, gin.H{"error": "Asset not found"})
		return
	}

	c.File(imagePath)
}

func getDeviceScreenshot(c *gin.Context) {
	deviceID := c.Param("id")
	adbPath := getAdbPath()

	cmd := exec.Command(adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	output, err := cmd.Output()
	if err != nil {
		c.JSON(500, gin.H{"error": "Screenshot failed: " + err.Error()})
		return
	}
	c.Data(200, "image/png", output)
}

func uploadAsset(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}

	scriptID := c.PostForm("scriptId")
	if scriptID == "" {
		scriptID = c.Param("id")
	}
	fmt.Printf("UploadAsset Request - ScriptID: '%s'\n", scriptID)

	// Resolve Core Path again just to be safe or use manager.CorePath
	// But uploads might go to Legacy core/assets
	var targetDir string
	var returnPath string

	if scriptID != "" {
		// New Structure: core/script/custom/<scriptId>/images
		// Validate scriptID simple characters
		scriptID = strings.ReplaceAll(scriptID, " ", "_")
		targetDir = filepath.Join(manager.CorePath, "script", "custom", scriptID, "images")
		returnPath = "script/custom/" + scriptID + "/images/" + filepath.Base(file.Filename)
	} else {
		// Legacy: core/assets
		targetDir = filepath.Join(manager.CorePath, "assets")
		returnPath = "assets/" + filepath.Base(file.Filename)
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		c.JSON(500, gin.H{"error": "Failed to create assets directory: " + err.Error()})
		return
	}

	filename := filepath.Base(file.Filename)
	targetPath := filepath.Join(targetDir, filename)

	if err := c.SaveUploadedFile(file, targetPath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file: " + err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "uploaded", "path": returnPath})
}

func listScripts(c *gin.Context) {
	scripts, err := manager.ListScripts()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, scripts)
}

type RunRequest struct {
	ScriptID string `json:"scriptId"`
	Params   string `json:"params"`
}

func runScript(c *gin.Context) {
	var req RunRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	runID, err := manager.RunScript(req.ScriptID, req.Params)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"runId": runID})
}

type StopRequest struct {
	RunID string `json:"runId"`
}

func stopScript(c *gin.Context) {
	var req StopRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if err := manager.StopScript(req.RunID); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "stopped"})
}

func listDevices(c *gin.Context) {
	adbPath := getAdbPath()

	getDevices := func() ([]string, error) {
		cmd := exec.Command(adbPath, "devices")
		output, err := cmd.CombinedOutput()
		if err != nil {
			return nil, err
		}

		lines := strings.Split(string(output), "\n")
		var devices []string

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "List of devices attached") {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 && parts[1] == "device" {
				devices = append(devices, parts[0])
			}
		}
		return devices, nil
	}

	devices, err := getDevices()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to execute adb: " + err.Error()})
		return
	}

	if devices == nil {
		devices = []string{}
	}

	c.JSON(200, devices)
}

// --- ADB Management Endpoints ---

func checkAdbStatus(c *gin.Context) {
	adbPath := getAdbPath()

	cmd := exec.Command(adbPath, "get-state")
	if err := cmd.Run(); err != nil {
		// If get-state fails, it might be that no device is connected, OR server is off.
		// Better check: tasklist on Windows
		if os.PathSeparator == '\\' {
			checkCmd := exec.Command("tasklist", "/FI", "IMAGENAME eq adb.exe", "/FO", "CSV", "/NH")
			out, _ := checkCmd.Output()
			if strings.Contains(string(out), "adb.exe") {
				c.JSON(200, gin.H{"status": "running", "details": "ADB process found"})
				return
			}
		} else {
			checkCmd := exec.Command("pgrep", "adb")
			if err := checkCmd.Run(); err == nil {
				c.JSON(200, gin.H{"status": "running", "details": "ADB process found"})
				return
			}
		}
		c.JSON(200, gin.H{"status": "stopped", "details": "ADB process not found"})
		return
	}
	c.JSON(200, gin.H{"status": "running", "details": "ADB responded to get-state"})
}

func startAdb(c *gin.Context) {
	adbPath := getAdbPath()

	err := exec.Command(adbPath, "start-server").Run()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to start ADB: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "started"})
}

func stopAdb(c *gin.Context) {
	adbPath := getAdbPath()

	err := exec.Command(adbPath, "kill-server").Run()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to stop ADB: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "stopped"})
}

func executeAdbCommand(c *gin.Context) {
	var req struct {
		Command string `json:"command"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	adbPath := getAdbPath()

	// Security: Only allow adb commands?
	// We will execute: adb <args>
	// Split command string into args
	args := strings.Fields(req.Command)

	cmd := exec.Command(adbPath, args...)
	output, err := cmd.CombinedOutput()

	result := string(output)
	if err != nil {
		result += "\nError: " + err.Error()
	}

	c.JSON(200, gin.H{"output": result})
}

func streamLogs(c *gin.Context) {
	runID := c.Param("id")

	logs, err := manager.GetLogChannel(runID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Process not found"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WS Upgrade error:", err)
		return
	}
	defer ws.Close()

	for msg := range logs {
		if err := ws.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
			break
		}
	}
}

func getScriptContent(c *gin.Context) {
	scriptID := c.Param("id")
	content, err := manager.GetScriptContent(scriptID)
	if err != nil {
		status := 500
		if err.Error() == "script not found" {
			status = 404
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"content": content})
}

type SaveContentRequest struct {
	Content string `json:"content"`
}

func saveScriptContent(c *gin.Context) {
	scriptID := c.Param("id")
	var req SaveContentRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	if err := manager.SaveScriptContent(scriptID, req.Content); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "saved"})
}

type CreateScriptRequest struct {
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

func createScript(c *gin.Context) {
	var req CreateScriptRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	if req.Name == "" {
		c.JSON(400, gin.H{"error": "Script name is required"})
		return
	}

	if err := manager.CreateScript(req.Name, req.Platform); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "created", "name": req.Name})
}

func deleteScript(c *gin.Context) {
	scriptID := c.Param("id")
	if err := manager.DeleteScript(scriptID); err != nil {
		status := 500
		if strings.Contains(err.Error(), "cannot delete") {
			status = 403
		} else if strings.Contains(err.Error(), "not found") {
			status = 404
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "deleted"})
}

func exportScript(c *gin.Context) {
	scriptID := c.Param("id")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.zip", scriptID))
	c.Header("Content-Type", "application/zip")

	if err := manager.ExportScriptZip(scriptID, c.Writer); err != nil {
		// Since headers are already sent if it fails mid-stream, it's hard to return JSON
		// but Gin might handle it or we can check before starting.
		log.Printf("Export failed: %v", err)
	}
}

func importScript(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	newName := c.PostForm("newName")

	if err := manager.ImportScriptZip(f, file.Size, newName); err != nil {
		if strings.HasPrefix(err.Error(), "CONFLICT_ALREADY_EXISTS:") {
			c.JSON(409, gin.H{
				"error":         "Script already exists",
				"suggestedName": strings.TrimPrefix(err.Error(), "CONFLICT_ALREADY_EXISTS:"),
			})
			return
		}
		c.JSON(500, gin.H{"error": "Import failed: " + err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "imported"})
}

func renameScript(c *gin.Context) {
	scriptID := c.Param("id")
	var req struct {
		NewName string `json:"newName"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	if err := manager.RenameScript(scriptID, req.NewName); err != nil {
		if strings.HasPrefix(err.Error(), "CONFLICT_ALREADY_EXISTS:") {
			c.JSON(409, gin.H{"error": "A script with this name already exists"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "renamed"})
}
