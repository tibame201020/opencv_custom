package backend_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"script-platform/server/backend"
	"script-platform/server/db"
	"script-platform/server/workflow"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Helper to find repo root and chdir to it
func setupTestEnv(t *testing.T) (string, func()) {
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("Could not find repo root (go.mod)")
		}
		dir = parent
	}

	// Change CWD to repo root so SetupRouter finds "core"
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}

	return dir, func() {
		os.Chdir(cwd)
	}
}

func TestRunWorkflowIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	root, cleanup := setupTestEnv(t)
	defer cleanup()

	// 1. Setup Environment
	corePath := filepath.Join(root, "core")
	toolsPath := filepath.Join(root, "tools")
	artifactsDir := filepath.Join(root, "artifacts")
	adbStubPath := filepath.Join(toolsPath, "adb_stub")
	adbLogPath := filepath.Join(artifactsDir, "adb_calls.jsonl")

	os.MkdirAll(artifactsDir, 0755)
	os.WriteFile(adbLogPath, []byte{}, 0644)
	os.Chmod(adbStubPath, 0755)

	t.Setenv("ADB_BIN", adbStubPath)
	t.Setenv("PYTHONPATH", corePath)

	// 2. Init DB
	dbPath := filepath.Join(os.TempDir(), fmt.Sprintf("test_workflow_%d.db", time.Now().UnixNano()))
	if err := db.Init(dbPath); err != nil {
		t.Fatalf("Failed to init db: %v", err)
	}
	defer os.Remove(dbPath)
	// Migrate DB schema? db.Init usually does auto-migrate if implemented.
	// Let's assume schema is created by Init or we need to run migrations.
	// Looking at db.go might be needed if Init doesn't create tables.
	// Assuming it does based on app.go usage.

	// Verify ADB Stub works manually
	cmd := exec.Command(adbStubPath, "devices")
	cmd.Env = os.Environ()
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Logf("Manual ADB Stub failed: %v, Output: %s", err, out)
	} else {
		t.Logf("Manual ADB Stub success: %s", out)
	}

	// 3. Setup Router
	// Set Gin to Test Mode
	gin.SetMode(gin.TestMode)
	router := backend.SetupRouter()

	// 4. Create Project
	projectID := "test_project"
	if err := workflow.SaveProject(projectID, "Test Project", "android", "Integration Test"); err != nil {
		t.Fatalf("Failed to save project: %v", err)
	}

	// 5. Create Workflow with click_image node
	// We need a template image.
	templatePath := filepath.Join(corePath, "test", "fixtures", "template.png")

	wfID := "test_workflow_integration"
	wf := &workflow.Workflow{
		ID:          wfID,
		ProjectID:   projectID,
		Name:        "Integration Flow",
		Description: "Testing Go-Python Bridge",
		Platform:    "android",
		Nodes: map[string]*workflow.WorkflowNode{
			"start": {
				ID:   "start",
				Name: "Start",
				Type: "start", // hypothetical start node, or just trigger
				X:    100,
				Y:    100,
			},
			"click_1": {
				ID:   "click_1",
				Name: "Click Template",
				Type: "click_image",
				Config: map[string]interface{}{
					"image":     templatePath,
					"threshold": 0.8,
					"timeout":   2000,
				},
				X: 300,
				Y: 100,
			},
		},
		Edges: []workflow.WorkflowEdge{
			{
				ID:         "edge_1",
				FromNodeID: "start",
				ToNodeID:   "click_1",
				Signal:     "success", // or empty if default
			},
		},
		StartNodeID: "start",
	}

	if err := workflow.SaveWorkflow(wf); err != nil {
		t.Fatalf("Failed to save workflow: %v", err)
	}

	// 6. Start Test Server
	ts := httptest.NewServer(router)
	defer ts.Close()

	// 7. Run Workflow via API
	resp, err := http.Post(ts.URL+"/api/workflows/"+wfID+"/run?deviceId=test_device", "application/json", nil)
	if err != nil {
		t.Fatalf("Failed to call API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Fatalf("API returned %d", resp.StatusCode)
	}

	var runResp map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&runResp); err != nil {
		t.Fatalf("Failed to parse run response: %v", err)
	}
	runID := runResp["runId"]
	if runID == "" {
		t.Fatal("runId is empty")
	}
	t.Logf("Workflow running with ID: %s", runID)

	// 8. Connect to WebSocket to capture logs
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http") + "/ws/logs/" + runID
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer ws.Close()

	done := make(chan struct{})

	go func() {
		defer close(done)
		for {
			_, message, err := ws.ReadMessage()
			if err != nil {
				return
			}
			t.Logf("[WS] %s", message)

			// Check for completion
			msgStr := string(message)
			if strings.Contains(msgStr, "Process exited") {
				return
			}
		}
	}()

	// 9. Wait for done or timeout
	select {
	case <-done:
		// Check logs
	case <-time.After(10 * time.Second):
		t.Fatal("Timeout waiting for workflow logs")
	}

	// 10. Verify ADB Calls
	content, err := os.ReadFile(adbLogPath)
	if err != nil {
		t.Fatalf("Failed to read ADB log: %v", err)
	}
	t.Logf("ADB Log Content:\n%s", string(content))

	lines := strings.Split(string(content), "\n")
	foundScreencap := false
	foundTap := false

	for _, line := range lines {
		if line == "" { continue }
		// Simple string check is enough if we look for the components
		if strings.Contains(line, "screencap") {
			foundScreencap = true
		}
		// JSON array: ["input", "tap", ...]
		if strings.Contains(line, "input") && strings.Contains(line, "tap") {
			foundTap = true
		}
	}

	if !foundScreencap {
		t.Error("Did not find 'screencap' in ADB calls")
	}
	if !foundTap {
		t.Error("Did not find 'input tap' in ADB calls")
	}
}
