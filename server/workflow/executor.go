package workflow

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"script-platform/server/utils"
	"sync"
)

// PythonBridge 管理與 workflow_bridge.py 的 stdin/stdout JSON 通訊
type PythonBridge struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout *bufio.Scanner
	mu     sync.Mutex
	closed bool
}

// BridgeRequest 送往 Python 的請求
type BridgeRequest struct {
	Action string                 `json:"action"`
	Params map[string]interface{} `json:"params,omitempty"`
}

// BridgeResponse Python 回傳的回應
type BridgeResponse struct {
	Signal string                 `json:"signal"`
	Output map[string]interface{} `json:"output,omitempty"`
	Error  string                 `json:"error,omitempty"`
}

// NewPythonBridge 啟動 workflow_bridge.py subprocess
func NewPythonBridge(ctx context.Context, pythonCmd, corePath, entryScript string, platform string, deviceId string) (*PythonBridge, error) {
	bridgeScript := corePath + "/workflow_bridge.py"

	var cmd *exec.Cmd
	if entryScript == "" {
		// Binary mode (standalone executable) - not applicable for bridge
		return nil, fmt.Errorf("workflow bridge requires Python mode")
	}

	cmd = exec.CommandContext(ctx, pythonCmd, "-u", bridgeScript)
	cmd.Dir = corePath
	utils.HideConsole(cmd)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %v", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	// Redirect stderr to parent process stderr for debugging
	cmd.Stderr = nil // Goes to os.Stderr by default when nil? Actually no.
	// Let's capture stderr separately so user can see Python logs
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start workflow bridge: %v", err)
	}

	// Forward stderr in background (Python log messages)
	go func() {
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			fmt.Printf("[Bridge/Python] %s\n", scanner.Text())
		}
	}()

	bridge := &PythonBridge{
		cmd:    cmd,
		stdin:  stdin,
		stdout: bufio.NewScanner(stdout),
	}

	// Wait for "ready" signal
	resp, err := bridge.readResponse()
	if err != nil {
		cmd.Process.Kill()
		return nil, fmt.Errorf("bridge failed to start: %v", err)
	}
	if resp.Signal != "ready" {
		cmd.Process.Kill()
		return nil, fmt.Errorf("bridge unexpected startup signal: %s", resp.Signal)
	}
	fmt.Printf("[Bridge] Python workflow bridge started (pid=%d)\n", cmd.Process.Pid)

	// Send init command
	initParams := map[string]interface{}{
		"platform": platform,
	}
	if deviceId != "" {
		initParams["device_id"] = deviceId
	}

	initResp, err := bridge.Call("init", initParams)
	if err != nil {
		cmd.Process.Kill()
		return nil, fmt.Errorf("bridge init failed: %v", err)
	}
	if initResp.Signal != "success" {
		cmd.Process.Kill()
		return nil, fmt.Errorf("bridge init error: %s", initResp.Error)
	}
	fmt.Printf("[Bridge] Platform initialised: %s\n", platform)

	return bridge, nil
}

// Call 送出一個 action 並等待回應
func (b *PythonBridge) Call(action string, params map[string]interface{}) (*BridgeResponse, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return nil, fmt.Errorf("bridge is closed")
	}

	req := BridgeRequest{
		Action: action,
		Params: params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Write JSON line
	if _, err := fmt.Fprintf(b.stdin, "%s\n", data); err != nil {
		return nil, fmt.Errorf("failed to write to bridge: %v", err)
	}

	// Read response
	return b.readResponse()
}

// readResponse 讀取一行 JSON 回應
func (b *PythonBridge) readResponse() (*BridgeResponse, error) {
	if !b.stdout.Scan() {
		if err := b.stdout.Err(); err != nil {
			return nil, fmt.Errorf("bridge stdout error: %v", err)
		}
		return nil, fmt.Errorf("bridge stdout closed unexpectedly")
	}

	line := b.stdout.Text()
	var resp BridgeResponse
	if err := json.Unmarshal([]byte(line), &resp); err != nil {
		return nil, fmt.Errorf("failed to parse bridge response: %v (raw: %s)", err, line)
	}

	return &resp, nil
}

// Close 關閉 bridge subprocess
func (b *PythonBridge) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return nil
	}
	b.closed = true

	// Try graceful shutdown
	req := BridgeRequest{Action: "shutdown"}
	data, _ := json.Marshal(req)
	fmt.Fprintf(b.stdin, "%s\n", data)
	b.stdin.Close()

	// Wait for process to exit (with timeout handled by context)
	err := b.cmd.Wait()
	fmt.Printf("[Bridge] Python workflow bridge stopped\n")
	return err
}

// --- Built-in Helper Nodes (for unit tests) ---

func CreateIfNode(id, name string, condition func(interface{}) bool) *WorkflowNode {
	return &WorkflowNode{
		ID:   id,
		Name: name,
		Type: NodeIf,
		Executor: func(ctx context.Context, arg NodeArg) NodeOutput {
			result := "false"
			if condition(arg.Input) {
				result = "true"
			}
			return NodeOutput{Signal: result, Output: arg.Input}
		},
	}
}

func CreateConvertNode(id, name string, converter func(interface{}) interface{}) *WorkflowNode {
	return &WorkflowNode{
		ID:   id,
		Name: name,
		Type: NodeConvert,
		Executor: func(ctx context.Context, arg NodeArg) NodeOutput {
			return NodeOutput{Signal: "success", Output: converter(arg.Input)}
		},
	}
}
