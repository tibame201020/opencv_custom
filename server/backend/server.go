package backend

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"script-platform/server/db"
	"script-platform/server/process_manager"
	"script-platform/server/utils"
	"script-platform/server/workflow"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var (
	manager *process_manager.ScriptManager
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

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

// getPythonCmd attempts to find the best python command (py -3, python, python3)
func getPythonCmd() string {
	// Try 'py' first (Windows Launcher)
	cmd := exec.Command("py", "--version")
	if err := cmd.Run(); err == nil {
		return "py"
	}

	// Try 'python'
	cmd = exec.Command("python", "--version")
	if err := cmd.Run(); err == nil {
		return "python"
	}

	// Try 'python3'
	cmd = exec.Command("python3", "--version")
	if err := cmd.Run(); err == nil {
		return "python3"
	}

	// Default to 'python' and let it fail if not found
	return "python"
}

func SetupRouter() *gin.Engine {
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
		cmdPath = getPythonCmd()
		fmt.Printf("Mode: Development (Using detected: %s)\n", cmdPath)
		entryScript = "entry.py"
	}

	manager = process_manager.NewScriptManager(corePath, cmdPath, entryScript)

	r := gin.Default()
	r.Use(func(c *gin.Context) {
		fmt.Printf("[API] %s %s\n", c.Request.Method, c.Request.URL.Path)
		c.Next()
	})

	// Enable CORS (Still useful for standalone dev tools if any)
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
		api.DELETE("/scripts/:id", deleteScript)

		// Asset Management
		api.GET("/scripts/:id/assets", listAssets)
		api.POST("/scripts/:id/assets/rename", renameAsset)
		api.DELETE("/scripts/:id/assets/*filename", deleteAsset)
		api.GET("/scripts/:id/raw-assets/*filename", getAssetRaw)

		api.GET("/devices/:id/screenshot", getDeviceScreenshot)
		api.GET("/desktop/screenshot", getDesktopScreenshot)
		api.POST("/scripts/:id/assets", uploadAsset)
		api.POST("/scripts/:id/assets/mkdir", mkdirAsset)
		api.POST("/scripts/:id/assets/move", moveAsset)
		api.POST("/scripts/:id/assets/create", createFile)

		// ZIP Import/Export
		api.GET("/scripts/:id/export", exportScript)
		api.GET("/scripts/:id/download", exportScript)
		api.POST("/scripts/import", importScript)

		// Rename
		api.POST("/scripts/:id/rename", renameScript)

		// Debug / ADB Management
		api.GET("/adb/status", checkAdbStatus)
		api.POST("/adb/start", startAdb)
		api.POST("/adb/stop", stopAdb)
		api.POST("/adb/command", executeAdbCommand)

		// Independent Virtual Workflow CRUD
		api.GET("/projects", listProjects)
		api.POST("/projects", createProject)
		api.POST("/projects/:id/rename", renameProject) // NEW
		api.DELETE("/projects/:id", deleteProject)      // NEW

		api.POST("/workflows", createWorkflow)
		api.GET("/workflows/:id", getWorkflow)
		api.POST("/workflows/:id", saveWorkflow)
		api.DELETE("/workflows/:id", deleteWorkflow)
		api.POST("/workflows/:id/run", runWorkflow)
		api.POST("/workflows/:id/rename", renameWorkflow) // NEW
	}

	r.GET("/ws/logs/:id", streamLogs)

	return r
}

// Cleanup is called when the application shuts down
func Cleanup() {
	fmt.Println("Performing cleanup: Killing ADB server...")
	adbPath := getAdbPath()
	cmd := exec.Command(adbPath, "kill-server")
	utils.HideConsole(cmd)
	if err := cmd.Run(); err != nil {
		fmt.Printf("Warning: Failed to kill ADB server during cleanup: %v\n", err)
	} else {
		fmt.Println("ADB server killed successfully.")
	}

	// Kill Persistent Python Bridge
	if manager != nil {
		manager.StopBridge()
	}
}

func normalizeID(id string) string {
	return strings.ReplaceAll(id, " ", "_")
}

func listAssets(c *gin.Context) {
	id := c.Param("id")
	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		if _, err := os.Stat(projectRoot); os.IsNotExist(err) {
			os.MkdirAll(projectRoot, 0755)
			os.MkdirAll(filepath.Join(projectRoot, "images"), 0755)
		} else {
			// Even if root exists, ensure images exists
			os.MkdirAll(filepath.Join(projectRoot, "images"), 0755)
		}
		assets := manager.WalkWorkflowDir(projectRoot)
		c.JSON(200, assets)
		return
	}
	scriptID := normalizeID(id)
	assets, err := manager.ListAssets(scriptID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, assets)
}

func renameAsset(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		OldName string `json:"oldName"`
		NewName string `json:"newName"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		oldPath := filepath.Join(projectRoot, req.OldName)
		newPath := filepath.Join(projectRoot, req.NewName)
		if err := os.Rename(oldPath, newPath); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	scriptID := normalizeID(id)
	if err := manager.RenameAsset(scriptID, req.OldName, req.NewName); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func deleteAsset(c *gin.Context) {
	id := c.Param("id")
	relPath := c.Param("filename")

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		targetPath := filepath.Join(projectRoot, relPath)
		if err := os.RemoveAll(targetPath); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	scriptID := normalizeID(id)
	if err := manager.DeleteAsset(scriptID, relPath); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func mkdirAsset(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Path string `json:"path"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		fullPath := filepath.Join(projectRoot, req.Path)
		if err := os.MkdirAll(fullPath, 0755); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	scriptID := normalizeID(id)
	if err := manager.MkdirAsset(scriptID, req.Path); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func moveAsset(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		oldPath := filepath.Join(projectRoot, req.OldPath)
		newPath := filepath.Join(projectRoot, req.NewPath)
		if err := os.Rename(oldPath, newPath); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	scriptID := normalizeID(id)
	if err := manager.MoveAsset(scriptID, req.OldPath, req.NewPath); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func createFile(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Path string `json:"path"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		fullPath := filepath.Join(projectRoot, req.Path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		if err := os.WriteFile(fullPath, []byte(""), 0644); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	scriptID := normalizeID(id)
	if err := manager.CreateFileAsset(scriptID, req.Path); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func getAssetRaw(c *gin.Context) {
	id := c.Param("id")
	filename := c.Param("filename")

	var projectRoot string

	if strings.HasPrefix(id, "workflow:") {
		wfID := strings.TrimPrefix(id, "workflow:")
		projectRoot = filepath.Join(manager.CorePath, "workflows", wfID)
	} else {
		scriptID := normalizeID(id)
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
			c.JSON(404, gin.H{"error": "script not found"})
			return
		}
		projectRoot = filepath.Join(manager.CorePath, filepath.Dir(scriptPath))
	}

	targetPath := filepath.Join(projectRoot, filename)

	// Security check: Use absolute paths to prevent escape
	cleanBase, _ := filepath.Abs(projectRoot)
	cleanTarget, _ := filepath.Abs(targetPath)

	if !strings.HasPrefix(cleanTarget, cleanBase) {
		c.JSON(403, gin.H{"error": "Forbidden"})
		return
	}

	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		c.JSON(404, gin.H{"error": "File not found"})
		return
	}

	c.File(targetPath)
}

func getDeviceScreenshot(c *gin.Context) {
	deviceID := c.Param("id")
	adbPath := getAdbPath()

	cmd := exec.Command(adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	utils.HideConsole(cmd)
	output, err := cmd.Output()
	if err != nil {
		c.JSON(500, gin.H{"error": "Screenshot failed: " + err.Error()})
		return
	}
	c.Data(200, "image/png", output)
}

func getDesktopScreenshot(c *gin.Context) {
	// 1. Try to use Persistent Python Bridge (Phase 2 Optimization)
	if err := manager.EnsureBridge(); err == nil {
		url := manager.GetBridgeURL("/screenshot")
		client := http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get(url)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			data, err := io.ReadAll(resp.Body)
			if err == nil {
				c.Data(200, "image/png", data)
				return
			}
		}
		fmt.Printf("Warning: Python Bridge failed, falling back: %v\n", err)
	}

	// 2. Fallback to legacy helper (Cold Start)
	cmdPath := getPythonCmd()
	helperPath := filepath.Join(manager.CorePath, "service", "platform", "robot", "screenshot_helper.py")

	cmd := exec.Command(cmdPath, helperPath)
	utils.HideConsole(cmd)

	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()

	if err != nil {
		c.JSON(500, gin.H{"error": "Desktop screenshot failed: " + err.Error()})
		return
	}

	c.Data(200, "image/png", out.Bytes())
}

func uploadAsset(c *gin.Context) {
	// Support JSON/Base64 for Wails compatibility
	if strings.Contains(strings.ToLower(c.ContentType()), "application/json") || strings.Contains(strings.ToLower(c.Request.Header.Get("Content-Type")), "application/json") {
		var req struct {
			Filename string `json:"filename"`
			Data     string `json:"data"` // Base64
			RelPath  string `json:"relPath"`
			ScriptId string `json:"scriptId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Invalid JSON: " + err.Error()})
			return
		}

		data, err := base64.StdEncoding.DecodeString(req.Data)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid Base64: " + err.Error()})
			return
		}

		scriptID := normalizeID(req.ScriptId)
		if scriptID == "" {
			scriptID = normalizeID(c.Param("id"))
		}

		// Resolve target directory
		var targetDir string
		var filename string

		if strings.HasPrefix(scriptID, "workflow:") {
			wfID := strings.TrimPrefix(scriptID, "workflow:")
			projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
			fullRelPath := req.RelPath
			if fullRelPath == "" {
				fullRelPath = "images/" + req.Filename
			}
			targetPath := filepath.Join(projectRoot, fullRelPath)
			targetDir = filepath.Dir(targetPath)
			filename = filepath.Base(fullRelPath)
		} else if scriptID != "" {
			scriptID = strings.ReplaceAll(scriptID, " ", "_")
			projectRoot := filepath.Join(manager.CorePath, "script", "custom", scriptID)

			fullRelPath := req.RelPath
			if fullRelPath == "" {
				fullRelPath = "images/" + req.Filename
			}

			targetPath := filepath.Join(projectRoot, fullRelPath)
			targetDir = filepath.Dir(targetPath)
			filename = filepath.Base(fullRelPath)
		} else {
			targetDir = filepath.Join(manager.CorePath, "assets")
			filename = filepath.Base(req.Filename)
		}

		if err := os.MkdirAll(targetDir, 0755); err != nil {
			c.JSON(500, gin.H{"error": "Failed to create directory"})
			return
		}

		if err := os.WriteFile(filepath.Join(targetDir, filename), data, 0644); err != nil {
			c.JSON(500, gin.H{"error": "Failed to save file"})
			return
		}

		c.JSON(200, gin.H{"status": "ok"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file uploaded (Check Content-Type)"})
		return
	}

	scriptID := normalizeID(c.PostForm("scriptId"))
	if scriptID == "" {
		scriptID = normalizeID(c.Param("id"))
	}

	// Resolve target directory
	var targetDir string
	var returnPath string
	var filename string

	// Try to get relPath from form (more reliable than file.Filename)
	relPath := c.PostForm("relPath")

	if strings.HasPrefix(scriptID, "workflow:") {
		wfID := strings.TrimPrefix(scriptID, "workflow:")
		projectRoot := filepath.Join(manager.CorePath, "workflows", wfID)
		var fullRelPath string
		if relPath != "" {
			fullRelPath = relPath
		} else {
			fullRelPath = "images/" + file.Filename
		}
		targetPath := filepath.Join(projectRoot, fullRelPath)
		targetDir = filepath.Dir(targetPath)
		filename = filepath.Base(fullRelPath)
		returnPath = "workflows/" + wfID + "/" + fullRelPath
	} else if scriptID != "" {
		// New Structure: core/script/custom/<scriptId>
		scriptID = strings.ReplaceAll(scriptID, " ", "_")
		projectRoot := filepath.Join(manager.CorePath, "script", "custom", scriptID)

		// Use relPath if provided, otherwise fallback to filename
		var fullRelPath string
		if relPath != "" {
			fullRelPath = relPath
		} else {
			// If no relPath, default to images/ folder for screenshots
			fullRelPath = "images/" + file.Filename
		}

		targetPath := filepath.Join(projectRoot, fullRelPath)
		targetDir = filepath.Dir(targetPath)
		filename = filepath.Base(fullRelPath)
		returnPath = "script/custom/" + scriptID + "/" + fullRelPath
	} else {
		// Legacy: core/assets
		targetDir = filepath.Join(manager.CorePath, "assets")
		if relPath != "" {
			filename = filepath.Base(relPath)
		} else {
			filename = filepath.Base(file.Filename)
		}
		returnPath = "assets/" + filename
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		c.JSON(500, gin.H{"error": "Failed to create assets directory: " + err.Error()})
		return
	}

	// Security check for final path
	finalPath := filepath.Join(targetDir, filename)
	cleanBase, _ := filepath.Abs(manager.CorePath)
	cleanTarget, _ := filepath.Abs(finalPath)
	if !strings.HasPrefix(cleanTarget, cleanBase) {
		c.JSON(403, gin.H{"error": "Forbidden: Path escape"})
		return
	}

	if err := c.SaveUploadedFile(file, finalPath); err != nil {
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
	req.ScriptID = normalizeID(req.ScriptID)

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
		utils.HideConsole(cmd)
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
	utils.HideConsole(cmd)
	if err := cmd.Run(); err != nil {
		// If get-state fails, it might be that no device is connected, OR server is off.
		// Better check: tasklist on Windows
		if os.PathSeparator == '\\' {
			checkCmd := exec.Command("tasklist", "/FI", "IMAGENAME eq adb.exe", "/FO", "CSV", "/NH")
			utils.HideConsole(checkCmd)
			out, _ := checkCmd.Output()
			if strings.Contains(string(out), "adb.exe") {
				c.JSON(200, gin.H{"status": "running", "details": "ADB process found"})
				return
			}
		} else {
			checkCmd := exec.Command("pgrep", "adb")
			utils.HideConsole(checkCmd)
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

	cmd := exec.Command(adbPath, "start-server")
	utils.HideConsole(cmd)
	err := cmd.Run()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to start ADB: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "started"})
}

func stopAdb(c *gin.Context) {
	adbPath := getAdbPath()

	cmd := exec.Command(adbPath, "kill-server")
	utils.HideConsole(cmd)
	err := cmd.Run()
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
	utils.HideConsole(cmd)
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
	scriptID := normalizeID(c.Param("id"))
	relPath := c.Query("path")
	isRaw := c.Query("raw") == "true"

	if isRaw {
		// Serve file directly (for images)
		// We can get the full path via manager.GetScriptPath (if it exists) or manually construct it
		// Looking at manager.go, getScriptPath is private. Let's see if we can use another way or export it.
		// Actually, manager.ResolvePath is available if corePath is known.
		// Let's assume manager provides a way or we construct it here.
		// Based on resolution in manager.go:
		fullPath, err := manager.GetAssetPath(scriptID, relPath)
		if err != nil {
			c.JSON(404, gin.H{"error": err.Error()})
			return
		}

		c.File(fullPath)
		return
	}

	content, err := manager.GetScriptContent(scriptID, relPath)
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
	scriptID := normalizeID(c.Param("id"))
	relPath := c.Query("path")
	var req SaveContentRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	if err := manager.SaveScriptContent(scriptID, relPath, req.Content); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"status": "ok"})
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
	scriptID := normalizeID(c.Param("id"))
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
	scriptID := normalizeID(c.Param("id"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.zip", scriptID))
	c.Header("Content-Type", "application/zip")

	if err := manager.ExportScriptZip(scriptID, c.Writer); err != nil {
		// Since headers are already sent if it fails mid-stream, it's hard to return JSON
		// but Gin might handle it or we can check before starting.
		log.Printf("Export failed: %v", err)
	}
}

func importScript(c *gin.Context) {
	// Check Content-Type to handle both Multipart and JSON (Base64)
	if strings.Contains(strings.ToLower(c.ContentType()), "application/json") || strings.Contains(strings.ToLower(c.Request.Header.Get("Content-Type")), "application/json") {
		var req struct {
			Filename string `json:"filename"`
			Data     string `json:"data"` // Base64
			NewName  string `json:"newName"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Invalid JSON: " + err.Error()})
			return
		}

		fmt.Printf("[Import] JSON Import: %s, Size: %d (Base64), OverrideName: %s\n", req.Filename, len(req.Data), req.NewName)

		// Decode Base64
		data, err := base64.StdEncoding.DecodeString(req.Data)
		if err != nil {
			// Try URL encoding fallback just in case
			data, err = base64.URLEncoding.DecodeString(req.Data)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid Base64: " + err.Error()})
				return
			}
		}

		reader := bytes.NewReader(data)
		if err := manager.ImportScriptZip(reader, int64(len(data)), req.NewName); err != nil {
			fmt.Printf("[Import] ImportScriptZip failed: %v\n", err)
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
		return
	}

	// Fallback to Multipart
	file, err := c.FormFile("file")
	if err != nil {
		fmt.Printf("[Import] Error getting form file: %v\n", err)
		c.JSON(400, gin.H{"error": "No file uploaded: " + err.Error()})
		return
	}

	f, err := file.Open()
	if err != nil {
		fmt.Printf("[Import] Error opening file: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	newName := c.PostForm("newName")
	fmt.Printf("[Import] Importing file: %s, Size: %d, OverrideName: %s\n", file.Filename, file.Size, newName)

	if err := manager.ImportScriptZip(f, file.Size, newName); err != nil {
		fmt.Printf("[Import] ImportScriptZip failed: %v\n", err)
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
	scriptID := normalizeID(c.Param("id"))
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

func listWorkflows(c *gin.Context) {
	// Redirect or use listProjects for now to avoid errors,
	// but UI will switch to /api/projects
	projects, err := workflow.ListProjects()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, projects)
}

func listProjects(c *gin.Context) {
	projects, err := workflow.ListProjects()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, projects)
}

func createProject(c *gin.Context) {
	var req struct {
		Name        string `json:"name"`
		Platform    string `json:"platform"`
		Description string `json:"description"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	id := normalizeID(req.Name) + "_" + fmt.Sprintf("%d", time.Now().Unix())
	if err := workflow.SaveProject(id, req.Name, req.Platform, req.Description); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Create project directory for assets
	projectRoot := filepath.Join(manager.CorePath, "workflows", id)
	os.MkdirAll(projectRoot, 0755)
	os.MkdirAll(filepath.Join(projectRoot, "images"), 0755)

	c.JSON(200, gin.H{"id": id, "name": req.Name, "platform": req.Platform})
}

func createWorkflow(c *gin.Context) {
	var req struct {
		ProjectID   string `json:"projectId"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	// Clean ID without suffix (User request)
	id := normalizeID(req.Name)

	// Check for conflict
	if _, err := workflow.GetWorkflow(id); err == nil {
		c.JSON(409, gin.H{"error": fmt.Sprintf("Workflow with name '%s' (ID: %s) already exists", req.Name, id)})
		return
	}

	wf := &workflow.Workflow{
		ID:          id,
		ProjectID:   req.ProjectID,
		Name:        req.Name,
		Description: req.Description,
		Nodes:       make(map[string]*workflow.WorkflowNode),
	}

	if err := workflow.SaveWorkflow(wf); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, wf)
}

func renameProject(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if err := workflow.RenameProject(id, req.Name); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func deleteProject(c *gin.Context) {
	id := c.Param("id")

	// Delete from DB (cascading to workflows)
	if err := workflow.DeleteProject(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Delete project directory assets
	projectRoot := filepath.Join(manager.CorePath, "workflows", id)
	os.RemoveAll(projectRoot)

	c.JSON(200, gin.H{"status": "deleted"})
}

func renameWorkflow(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if err := workflow.RenameWorkflow(id, req.Name); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func getWorkflow(c *gin.Context) {
	id := c.Param("id")
	fmt.Printf("[API] getWorkflow called for id: %s\n", id)

	wf, err := workflow.GetWorkflow(id)
	if err != nil {
		fmt.Printf("[API] getWorkflow error: %v\n", err)
		c.JSON(404, gin.H{"error": err.Error()})
		return
	}

	// Explicit Marshal to debug empty body issue
	b, err := json.Marshal(wf)
	if err != nil {
		fmt.Printf("[API] JSON Marshal error: %v\n", err)
		c.JSON(500, gin.H{"error": "JSON Marshal failed"})
		return
	}

	fmt.Printf("[API] getWorkflow success, sending %d bytes\n", len(b))
	c.Data(200, "application/json", b)
}

func saveWorkflow(c *gin.Context) {
	var wf workflow.Workflow
	if err := c.BindJSON(&wf); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
		return
	}
	if err := workflow.SaveWorkflow(&wf); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "ok"})
}

func deleteWorkflow(c *gin.Context) {
	id := c.Param("id")
	_, err := db.DB.Exec("DELETE FROM workflows WHERE id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "deleted"})
}

func runWorkflow(c *gin.Context) {
	id := c.Param("id")
	wf, err := workflow.GetWorkflow(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "Workflow not found"})
		return
	}

	// Start "Virtual" Process via Manager
	runID, proc, ctx, err := manager.StartWorkflow(wf.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to start workflow process: %v", err)})
		return
	}

	// Return RunID immediately so UI can connect WebSocket
	c.JSON(200, gin.H{"runId": runID})

	// Execute in Goroutine
	go func() {
		defer close(proc.Logs) // Close logs when done to signal WS to close
		defer func() {
			proc.Logs <- `{"type": "status", "message": "Process exited"}`
		}()

		// Helper to log to both server console and WebSocket
		logger := func(msg string) {
			// Print to server console
			// fmt.Print(msg)
			// Send to WebSocket (buffered)
			select {
			case proc.Logs <- msg:
			default:
				// Drop log if buffer full to prevent blocking?
				// Or increase buffer. For now, non-blocking try.
				fmt.Println("[Warn] Log buffer full, dropping message")
			}
		}

		logger(fmt.Sprintf("Starting workflow: %s (%s)\n", wf.Name, wf.ID))

		// Check if any nodes need the Python bridge (platform/vision actions)
		needsBridge := false
		for _, node := range wf.Nodes {
			t := string(node.Type)
			switch t {
			case "click", "swipe", "type_text", "key_event", "screenshot",
				"find_image", "click_image", "wait_image", "wait_click_image",
				"ocr_text", "ocr_pattern":
				needsBridge = true
			}
			if needsBridge {
				break
			}
		}

		var bridge *workflow.PythonBridge

		if needsBridge {
			logger("Initializing Python Bridge...\n")
			// Determine platform from workflow or default to android
			platform := wf.Platform
			if platform == "" {
				platform = "android"
			}

			// TODO: get deviceId from request body or workflow config
			deviceId := ""

			bridge, err = workflow.NewPythonBridge(
				ctx, // Use the process context!
				manager.CmdPath,
				manager.CorePath,
				manager.EntryScript,
				platform,
				deviceId,
			)
			if err != nil {
				errMsg := fmt.Sprintf("Failed to start Python bridge: %v", err)
				logger(errMsg + "\n")
				proc.Logs <- fmt.Sprintf(`{"type": "error", "message": "%s"}`, errMsg)
				return
			}
			defer bridge.Close()
			logger("Python Bridge ready.\n")
		}

		// Wire executors (pass logger!)
		workflow.WireBuiltinExecutors(wf, bridge, logger)

		engine := workflow.NewFlowEngine(wf)
		engine.OnStep = func(step workflow.ExecutionStep) {
			// Stream execution step
			msg := map[string]interface{}{
				"type": "execution_step",
				"data": step,
			}
			if b, err := json.Marshal(msg); err == nil {
				proc.Logs <- string(b)
			}
		}

		result, err := engine.Execute(ctx, nil)

		if err != nil {
			// Check if cancelled
			if ctx.Err() == context.Canceled {
				logger("\nWorkflow execution cancelled.\n")
				proc.Logs <- `{"type": "status", "message": "Workflow cancelled"}`
			} else {
				logger(fmt.Sprintf("\nWorkflow execution failed: %v\n", err))
				proc.Logs <- fmt.Sprintf(`{"type": "error", "message": "Error: %v"}`, err)
			}
			return
		}

		logger(fmt.Sprintf("\nExecution complete: %d steps\n", len(result.ExecutionPath)))
		proc.Logs <- `{"type": "status", "message": "Workflow Execution Complete"}`
	}()
}
