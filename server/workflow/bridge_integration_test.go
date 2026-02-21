package workflow_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	artifactsDir := filepath.Join(root, "artifacts")
	adbStubPath := filepath.Join(toolsPath, "adb_stub")
	adbLogPath := filepath.Join(artifactsDir, "adb_calls.jsonl")

	// Ensure artifacts dir exists
	os.MkdirAll(artifactsDir, 0755)

	// Truncate adb log
	os.WriteFile(adbLogPath, []byte{}, 0644)

	// Verify adb_stub exists
	if _, err := os.Stat(adbStubPath); os.IsNotExist(err) {
		t.Fatalf("adb_stub not found at %s", adbStubPath)
	}

	// Make adb_stub executable (just in case)
	os.Chmod(adbStubPath, 0755)

	// Set Environment Variables for the test process
	// Note: exec.Command inherits os.Environ() by default if Cmd.Env is nil.
	// Since NewPythonBridge uses exec.CommandContext without setting Env,
	// we can set env vars in the current process.
	t.Setenv("ADB_BIN", adbStubPath)
	t.Setenv("PYTHONPATH", corePath)

	// Detect python
	pythonCmd := "python3"
	if _, err := exec.LookPath(pythonCmd); err != nil {
		pythonCmd = "python" // Fallback
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Start Bridge
	fmt.Println("Starting Python Bridge...")
	bridge, err := workflow.NewPythonBridge(
		ctx,
		pythonCmd,
		corePath,
		"entry.py", // entryScript is just for checking mode in NewPythonBridge, effectively unused for bridge script path logic
		"android",
		"test_device_id",
	)
	if err != nil {
		t.Fatalf("Failed to start bridge: %v", err)
	}
	defer bridge.Close()

	// 2. Test click_image (Success Case)
	fmt.Println("Testing click_image...")
	// We use a fixture template that exists
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
	if val, ok := outputMap["clicked"]; !ok || val != true {
		t.Errorf("Expected clicked=true, got %v", val)
	}

	// 3. Verify ADB Calls
	verifyAdbCalls(t, adbLogPath)

	// 4. Test Error Case (Invalid Action)
	fmt.Println("Testing invalid action...")
	errResp, err := bridge.Call("invalid_action_xyz", nil)
	if err != nil {
		// Bridge.Call might return error if pipe breaks, but here we expect the bridge to stay alive and return error signal
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

	// We expect at least:
	// 1. screencap (exec-out screencap -p)
	// 2. tap (shell input tap x y)

	foundScreencap := false
	foundTap := false

	for _, line := range lines {
		if line == "" { continue }
		var call AdbCall
		if err := json.Unmarshal([]byte(line), &call); err != nil {
			t.Logf("Invalid JSON in log: %s", line)
			continue
		}

		argsStr := strings.Join(call.Args, " ")
		if strings.Contains(argsStr, "screencap") {
			foundScreencap = true
		}
		if strings.Contains(argsStr, "input tap") {
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
