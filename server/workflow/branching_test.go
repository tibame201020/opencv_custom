package workflow

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"testing"
	"time"
)

// MockBridge creates a PythonBridge that talks to a mock backend
func NewMockBridge(t *testing.T, handler func(req BridgeRequest) BridgeResponse) *PythonBridge {
	// Create pipes
	// Bridge writes to stdin (our readEnd), we read from it
	// We write to stdout (our writeEnd), Bridge reads from it

	// bridge.stdin (WriteCloser) -> rIn
	rIn, wIn := io.Pipe()

	// wOut -> bridge.stdout (Scanner)
	rOut, wOut := io.Pipe()

	bridge := &PythonBridge{
		stdin:  wIn,
		stdout: bufio.NewScanner(rOut),
	}

	// Start a goroutine to handle requests
	go func() {
		scanner := bufio.NewScanner(rIn)
		for scanner.Scan() {
			line := scanner.Bytes()
			var req BridgeRequest
			if err := json.Unmarshal(line, &req); err != nil {
				t.Logf("MockBridge: Failed to parse request: %v", err)
				continue
			}

			resp := handler(req)
			respBytes, _ := json.Marshal(resp)
			wOut.Write(respBytes)
			wOut.Write([]byte("\n"))
		}
	}()

	return bridge
}

func getTestWorkflow() *Workflow {
	return &Workflow{
		ID: "test-branching",
		Nodes: []*WorkflowNode{
			{ID: "start", Type: "start", Name: "Start", X: 0, Y: 0},
			{ID: "find", Type: "find_image", Name: "Find Image", Config: map[string]interface{}{"image": "test.png"}, X: 100, Y: 0},
			{ID: "logA", Type: "log", Name: "Log Found", Config: map[string]interface{}{"message": "Found"}, X: 200, Y: -50},
			{ID: "logB", Type: "log", Name: "Log Not Found", Config: map[string]interface{}{"message": "Not Found"}, X: 200, Y: 50},
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "start", ToNodeID: "find"},
			{ID: "e2", FromNodeID: "find", ToNodeID: "logA", Signal: "true"},
			{ID: "e3", FromNodeID: "find", ToNodeID: "logB", Signal: "false"},
		},
		StartNodeID: "start",
	}
}

func TestFindImageBranching(t *testing.T) {
	// 1. Test Found Case
	t.Run("Found=True", func(t *testing.T) {
		wf := getTestWorkflow()
		bridge := NewMockBridge(t, func(req BridgeRequest) BridgeResponse {
			if req.Action == "find_image" {
				return BridgeResponse{
					Signal: "success",
					Output: map[string]interface{}{
						"found": true,
						"x":     100,
						"y":     200,
					},
				}
			}
			return BridgeResponse{Signal: "success", Output: map[string]interface{}{}}
		})

		// Wire executors
		WireBuiltinExecutors(wf, bridge, func(s string) { t.Log(s) })

		engine := NewFlowEngine(wf)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		result, err := engine.Execute(ctx, nil)
		if err != nil {
			t.Fatalf("Execute failed: %v", err)
		}

		// Verify Execution Path
		foundLogA := false
		foundLogB := false

		for _, step := range result.ExecutionPath {
			if step.NodeID == "logA" {
				foundLogA = true
			}
			if step.NodeID == "logB" {
				foundLogB = true
			}
		}

		if !foundLogA {
			t.Errorf("Expected execution to reach LogA (Found path), but it didn't")
		}
		if foundLogB {
			t.Errorf("Expected execution NOT to reach LogB (Not Found path), but it did")
		}
	})

	// 2. Test Not Found Case
	t.Run("Found=False", func(t *testing.T) {
		wf := getTestWorkflow()
		bridge := NewMockBridge(t, func(req BridgeRequest) BridgeResponse {
			if req.Action == "find_image" {
				return BridgeResponse{
					Signal: "success",
					Output: map[string]interface{}{
						"found": false,
					},
				}
			}
			return BridgeResponse{Signal: "success", Output: map[string]interface{}{}}
		})

		// Wire executors
		WireBuiltinExecutors(wf, bridge, func(s string) { t.Log(s) })

		engine := NewFlowEngine(wf)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		result, err := engine.Execute(ctx, nil)
		if err != nil {
			t.Fatalf("Execute failed: %v", err)
		}

		foundLogA := false
		foundLogB := false

		for _, step := range result.ExecutionPath {
			if step.NodeID == "logA" {
				foundLogA = true
			}
			if step.NodeID == "logB" {
				foundLogB = true
			}
		}

		if foundLogA {
			t.Errorf("Expected execution NOT to reach LogA, but it did")
		}
		if !foundLogB {
			t.Errorf("Expected execution to reach LogB (Not Found path), but it didn't")
		}
	})
}
