package main

import (
	"context"
	"embed"
	"net"
	"net/http"
	"script-platform/server/backend"
	"script-platform/server/db"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Initialize Database
	if err := db.Init("workflows.db"); err != nil {
		println("Fatal error initializing database:", err.Error())
		return
	}

	// Setup API Router
	router := backend.SetupRouter()

	// Start a background listener for WebSockets/API
	// We use a real TCP port because WebView2 doesn't support WebSockets on virtual origins (wails.localhost)
	ln, err := net.Listen("tcp", ":12857")
	if err != nil {
		// If 12857 is taken, pick any free port
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			println("Critical Error: Could not find any free port for backend")
		}
	}

	if ln != nil {
		app.WSPort = ln.Addr().(*net.TCPAddr).Port
		println("Backend listening on port:", app.WSPort)
		go func() {
			_ = http.Serve(ln, router)
		}()
	}

	// Create application with options
	err = wails.Run(&options.App{
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
