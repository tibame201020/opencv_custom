package backend

import (
	"context"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func setupTestServer(t *testing.T) (*gin.Engine, string, func()) {
	tempDir, _ := os.MkdirTemp("", "ws-test-*")

	// Create core structure
	os.MkdirAll(filepath.Join(tempDir, "core", "script", "custom"), 0755)

	// Create mock entry.py
	entryContent := `
import sys
import time

# Mock entry.py that simulates script execution for testing
print("Hello WS")
time.sleep(0.1)
print("Done WS")
`
	os.WriteFile(filepath.Join(tempDir, "core", "entry.py"), []byte(entryContent), 0644)

	// Set CWD to tempDir so resolvePath works
	oldCwd, _ := os.Getwd()
	os.Chdir(tempDir)

	r := SetupRouter()

	cleanup := func() {
		os.Chdir(oldCwd)
		os.RemoveAll(tempDir)
	}

	return r, tempDir, cleanup
}

func TestWebSocketLogStreaming(t *testing.T) {
	// Setup Test Server
	r, tempDir, cleanup := setupTestServer(t)
	defer cleanup()

	// 1. Create a dummy script
	scriptName := "WSTestScript"
	scriptDir := resolvePath(tempDir, "core", "script", "custom", scriptName)
	os.MkdirAll(scriptDir, 0755)
	os.WriteFile(resolvePath(scriptDir, scriptName+".py"), []byte("import time\nprint('Hello WS')\ntime.Sleep(0.1)\nprint('Done WS')\n"), 0644)

	// Refresh manager if needed (SetupRouter already initialized it, but let's be sure it points to our temp core)
	// manager is a global in server.go. SetupRouter sets it up.

	// 2. Start the script via API
	// Since we are using manager.RunScript, we need to ensure manager is hooked to real python or mocked.
	// For this test, we just want to verify if GetLogChannel and WS handler work.
	// We can manually inject a process into the manager for testing.

	// Actually, let's use the real RunScript but mock the command if possible?
	// The manager has a mu map[string]*ScriptProcess.
	// To avoid complex mocking of subprocesses, let's just verify the WebSocket upgrade logic.

	// 3. Test streamLogs handler directly
	// We need a runID that exists in the manager.
	// Since manager.processes is private, we'll trigger a run.

	// Start a dummy process that just prints something
	runID, err := manager.RunScript(scriptName, "{}")
	if err != nil {
		t.Fatalf("Failed to run script: %v", err)
	}

	// 4. Connect to WebSocket
	server := httptest.NewServer(r)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws/logs/" + runID

	dialer := websocket.Dialer{}
	ws, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer ws.Close()

	// 5. Read messages
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	receivedHello := false
	receivedDone := false

	for {
		select {
		case <-ctx.Done():
			t.Fatal("Timeout waiting for logs")
		default:
			_, message, err := ws.ReadMessage()
			if err != nil {
				// Success if we got everything and process exited (channel closed)
				// Abnormal closure (1006) might happen in some test environments if handshake isn't finished
				if receivedHello && receivedDone {
					return
				}
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseAbnormalClosure) {
					if receivedHello && receivedDone {
						return
					}
				}
				t.Fatalf("Error reading message: %v", err)
			}
			msgStr := string(message)
			if strings.Contains(msgStr, "Hello WS") {
				receivedHello = true
			}
			if strings.Contains(msgStr, "Done WS") {
				receivedDone = true
			}
			if strings.Contains(msgStr, "Process exited") {
				if receivedHello && receivedDone {
					return
				}
			}
		}
	}
}
