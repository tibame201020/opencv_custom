package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"server/process_manager"
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

func main() {
	cwd, _ := os.Getwd()
	// Assume we are running from server/ or root?
	// The user runs python from root/core usually.
	// We'll assume the binary is run from `server/` or we can find `../core`

	corePath := filepath.Join(cwd, "..", "core")
	// Use 'python' from PATH. In windows might need 'python.exe' or specific venv
	pythonPath := "python"

	manager = process_manager.NewScriptManager(corePath, pythonPath)

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
		api.POST("/run", runScript)
		api.POST("/stop", stopScript)
		api.GET("/devices", listDevices)
		api.GET("/scripts/:id/content", getScriptContent)
		api.POST("/scripts/:id/content", saveScriptContent)
	}

	r.GET("/ws/logs/:id", streamLogs)

	port := ":8080"
	fmt.Printf("Server starting on %s\n", port)
	r.Run(port)
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
	// Execute 'adb devices' using relative path
	cwd, _ := os.Getwd()
	adbPath := filepath.Join(cwd, "..", "platform-tools", "adb.exe")

	cmd := exec.Command(adbPath, "devices")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to execute adb: " + err.Error()})
		return
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

	c.JSON(200, devices)
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
