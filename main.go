package main

import (
	"embed"
	"net/http"
	"script-platform/server/backend"
	"script-platform/server/db"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Initialize Database
	if err := db.Init("workflows.db"); err != nil {
		println("Fatal error initializing database:", err.Error())
		return
	}

	// Setup API Router
	router := backend.SetupRouter()

	// Server Only Mode for Headless Environment
	println("Backend listening on port: 12857")
	if err := http.ListenAndServe(":12857", router); err != nil {
		println("Error:", err.Error())
	}
}
