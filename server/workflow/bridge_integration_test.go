package workflow_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"script-platform/server/workflow"
	"strings"
	"testing"
	"time"
)

func getRepoRoot(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("Could not find repo root (go.mod)")
		}
		dir = parent
	}
}

type AdbCall struct {
	Args []string `json:"args"`
	Cwd  string   `json:"cwd"`
}

func TestBridgeIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	root := getRepoRoot(t)
	corePath := filepath.Join(root, "core")
	toolsPath := filepath.Join(root, "tools")
	adbStubPath := filepath.Join(toolsPath, "adb_stub")
	if runtime.GOOS == "windows" {
		adbStubPath += ".bat"
	}

	// Use TempDir for log isolation
	tempDir := t.TempDir()
	adbLogPath := filepath.Join(tempDir, "adb_calls.jsonl")

	// Verify adb_stub exists
	if _, err := os.Stat(adbStubPath); os.IsNotExist(err) {
		t.Fatalf("adb_stub not found at %s", adbStubPath)
	}

	// Make adb_stub executable
	os.Chmod(adbStubPath, 0755)

	// Set Environment Variables
	t.Setenv("ADB_BIN", adbStubPath)
	t.Setenv("PYTHONPATH", corePath)
	t.Setenv("ADB_STUB_LOG", adbLogPath)

	// Detect python
	pythonCmd := "python"
	if err := exec.Command(pythonCmd, "--version").Run(); err != nil {
		pythonCmd = "python3"
	}
	if err := exec.Command(pythonCmd, "--version").Run(); err != nil {
		pythonCmd = "py"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Start Bridge
	fmt.Println("Starting Python Bridge...")
	bridge, err := workflow.NewPythonBridge(
		ctx,
		pythonCmd,
		corePath,
		"workflow_bridge.py",
		"android",
		"test_device_id",
		"",
	)
	if err != nil {
		t.Fatalf("Failed to start bridge: %v", err)
	}
	defer bridge.Close()

	// 2. Test click_image (Success Case)
	fmt.Println("Testing click_image...")
	templatePath := filepath.Join(corePath, "test", "fixtures", "template.png")

	resp, err := bridge.Call("click_image", map[string]interface{}{
		"image":     templatePath,
		"threshold": 0.8,
		"timeout":   2000,
	})
	if err != nil {
		t.Fatalf("click_image call failed: %v", err)
	}
	if resp.Signal != "success" {
		t.Fatalf("click_image returned error signal: %s (error: %s)", resp.Signal, resp.Error)
	}

	// Verify output
	outputMap, ok := resp.Output.(map[string]interface{})
	if !ok {
		t.Fatalf("Unexpected output format: %v", resp.Output)
	}
	if val, ok := outputMap["success"]; !ok || val != true {
		t.Errorf("Expected success=true, got %v", val)
	}

	// 3. Verify ADB Calls Order
	verifyAdbCalls(t, adbLogPath)

	// 4. Test Error Case (Invalid Action)
	fmt.Println("Testing invalid action...")
	errResp, err := bridge.Call("invalid_action_xyz", nil)
	if err != nil {
		t.Fatalf("Call failed: %v", err)
	}
	if errResp.Signal != "error" {
		t.Errorf("Expected error signal for invalid action, got %s", errResp.Signal)
	}
	if !strings.Contains(errResp.Error, "unknown action") {
		t.Errorf("Expected 'unknown action' error, got: %s", errResp.Error)
	}

	fmt.Println("Integration test passed!")
}

func verifyAdbCalls(t *testing.T, logPath string) {
	// Give a slight delay for file flush
	time.Sleep(100 * time.Millisecond)

	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("Failed to read adb log: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(string(content)), "\n")
	if len(lines) == 0 {
		t.Fatal("No ADB calls logged")
	}

	screencapIdx := -1
	tapIdx := -1

	for i, line := range lines {
		if line == "" {
			continue
		}
		var call AdbCall
		if err := json.Unmarshal([]byte(line), &call); err != nil {
			t.Logf("Invalid JSON in log: %s", line)
			continue
		}

		argsStr := strings.Join(call.Args, " ")
		// Check for screencap
		if strings.Contains(argsStr, "screencap") {
			if screencapIdx == -1 {
				screencapIdx = i
			}
		}
		// Check for input tap
		if strings.Contains(argsStr, "input") && strings.Contains(argsStr, "tap") {
			tapIdx = i
		}
	}

	if screencapIdx == -1 {
		t.Error("Did not find 'screencap' in ADB calls")
	}
	if tapIdx == -1 {
		t.Error("Did not find 'input tap' in ADB calls")
	}

	if screencapIdx > -1 && tapIdx > -1 {
		if screencapIdx >= tapIdx {
			t.Errorf("Order violation: screencap (idx=%d) came after or same as input tap (idx=%d)", screencapIdx, tapIdx)
		} else {
			t.Logf("Verified order: screencap (idx=%d) -> input tap (idx=%d)", screencapIdx, tapIdx)
		}
	}
}
