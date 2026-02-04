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

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Start the backend server in a separate goroutine
	go backend.StartServer()
}

// GetApiBaseUrl returns the dynamic backend API URL
func (a *App) GetApiBaseUrl() string {
	return backend.GetAPIURL()
}
