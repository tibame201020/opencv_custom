package main

import (
	"context"
)

// App struct
type App struct {
	ctx    context.Context
	WSPort int
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetWSPort() int {
	return a.WSPort
}
