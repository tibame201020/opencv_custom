package main

import (
	"context"
	"embed"
	"net/http"
	"script-platform/server/backend"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Setup API Router
	router := backend.SetupRouter()

	// Start a background listener on fixed port 8080 for Dev Mode (e.g. Vite proxy)
	// We don't care if it fails in Prod or if the port is busy, as Wails will use the Handler directly.
	go func() {
		_ = http.ListenAndServe(":8080", router)
	}()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Script Platform",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: router,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown: func(ctx context.Context) {
			backend.Cleanup()
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
