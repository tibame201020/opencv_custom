package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"server/process_manager"

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
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Next()
	})

	api := r.Group("/api")
	{
		api.GET("/scripts", listScripts)
		api.POST("/run", runScript)
		api.POST("/stop", stopScript)
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

func stopScript(c *gin.Context) {
	// TODO: Implement
	c.JSON(501, gin.H{"error": "Not implemented"})
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
