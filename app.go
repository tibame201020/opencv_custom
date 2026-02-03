package main

import (
	"context"
	"script-platform/server/backend" // We will move server/main.go logic here
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Start the backend server in a separate goroutine
	// This allows the frontend to connect to localhost:8080 as before
	go backend.StartServer()
}
