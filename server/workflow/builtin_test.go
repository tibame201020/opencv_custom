package workflow

import (
	"context"
	"encoding/json"
	"testing"
)

// Helper to run workflow and get success output
func runSimpleWorkflow(t *testing.T, wf *Workflow, input interface{}) map[string]ExecutionData {
	// Wire executors (nil bridge -> stub)
	WireBuiltinExecutors(wf, nil, func(msg string) {
		// fmt.Print(msg) // Uncomment for debug logs
	})

	engine := NewFlowEngine(wf)
	result, err := engine.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("Workflow execution failed: %v", err)
	}
	return result.Output
}

func TestSetVariable(t *testing.T) {
	wf := &Workflow{
		ID: "set_var_test",
		Nodes: map[string]*WorkflowNode{
			"set": {
				ID:   "set",
				Type: "set_variable",
				Config: map[string]interface{}{
					"newKey": "newValue",
					"calc":   "{{$json.value}} world",
				},
			},
		},
		StartNodeID: "set",
	}

	output := runSimpleWorkflow(t, wf, map[string]interface{}{"value": "hello"})

	data := output["success"]
	if len(data) != 1 {
		t.Fatalf("Expected 1 item, got %d", len(data))
	}

	jsonMap := data[0].JSON
	if jsonMap["newKey"] != "newValue" {
		t.Errorf("Expected newKey=newValue, got %v", jsonMap["newKey"])
	}
	if jsonMap["calc"] != "hello world" {
		t.Errorf("Expected calc='hello world', got %v", jsonMap["calc"])
	}
	// Check original value preserved
	if jsonMap["value"] != "hello" {
		t.Errorf("Expected value=hello, got %v", jsonMap["value"])
	}
}

func TestLoopFeedback(t *testing.T) {
	wf := &Workflow{
		ID: "loop_test",
		Nodes: map[string]*WorkflowNode{
			"loop": {
				ID:   "loop",
				Type: "loop",
				Config: map[string]interface{}{
					"count": 3,
				},
			},
			"process": {
				ID:   "process",
				Type: "set_variable",
				Config: map[string]interface{}{
					"processed": true,
					"index_copy": "{{$json.index}}",
				},
			},
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "loop", ToNodeID: "process", Signal: "body"},
			{ID: "e2", FromNodeID: "process", ToNodeID: "loop", Signal: "success"},
		},
		StartNodeID: "loop",
	}

	runCount := 0

	processExecutor := func(ctx context.Context, arg NodeArg) NodeOutput {
		runCount++
		return NodeOutput{Outputs: map[string]ExecutionData{"success": arg.Input}}
	}

	wf.Nodes["process"].Executor = processExecutor

	WireBuiltinExecutors(wf, nil, nil)

	engine := NewFlowEngine(wf)
	_, err := engine.Execute(context.Background(), nil)
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	if runCount != 3 {
		t.Errorf("Expected process to run 3 times, got %d", runCount)
	}
}

func TestLoopWithItems(t *testing.T) {
	items := []interface{}{"A", "B", "C"}
	itemsJson, _ := json.Marshal(items)

	wf := &Workflow{
		ID: "loop_items",
		Nodes: map[string]*WorkflowNode{
			"loop": {
				ID:   "loop",
				Type: "loop",
				Config: map[string]interface{}{
					"items": string(itemsJson),
				},
			},
			"process": {
				ID: "process",
				Type: "set_variable",
				Config: map[string]interface{}{
					"val": "{{$json.item}}",
				},
			},
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "loop", ToNodeID: "process", Signal: "body"},
			{ID: "e2", FromNodeID: "process", ToNodeID: "loop", Signal: "success"},
		},
		StartNodeID: "loop",
	}

	var processedItems []string
	wf.Nodes["process"].Executor = func(ctx context.Context, arg NodeArg) NodeOutput {
		for _, item := range arg.Input {
			if s, ok := item.JSON["item"].(string); ok {
				processedItems = append(processedItems, s)
			}
		}
		return NodeOutput{Outputs: map[string]ExecutionData{"success": arg.Input}}
	}

	WireBuiltinExecutors(wf, nil, nil)
	engine := NewFlowEngine(wf)
	_, err := engine.Execute(context.Background(), nil)
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	if len(processedItems) != 3 {
		t.Errorf("Expected 3 items processed, got %d", len(processedItems))
	}
}

func TestLoopDynamicItems(t *testing.T) {
	// Dynamic items from input: { "list": ["X", "Y"] }
	// We pass this input to start.
	// Loop configured with items: {{$json.list}}

	// Issue: If we feedback from process -> loop, the input to loop changes.
	// Does loop robustly handle this?

	wf := &Workflow{
		ID: "loop_dynamic",
		Nodes: map[string]*WorkflowNode{
			"loop": {
				ID:   "loop",
				Type: "loop",
				Config: map[string]interface{}{
					"items": "{{$json.list}}", // Depends on input
				},
			},
			"process": {
				ID: "process",
				Type: "code", // Just pass through
				Config: map[string]interface{}{},
			},
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "loop", ToNodeID: "process", Signal: "body"},
			{ID: "e2", FromNodeID: "process", ToNodeID: "loop", Signal: "success"},
		},
		StartNodeID: "loop",
	}

	runCount := 0
	wf.Nodes["process"].Executor = func(ctx context.Context, arg NodeArg) NodeOutput {
		runCount++
		// Pass through input (which is the ITEM from loop, e.g. "X")
		// It does NOT contain "list".
		return NodeOutput{Outputs: map[string]ExecutionData{"success": arg.Input}}
	}

	WireBuiltinExecutors(wf, nil, nil)
	engine := NewFlowEngine(wf)

	input := map[string]interface{}{
		"list": []interface{}{"X", "Y"},
	}

	// Expect failure or early exit if Loop re-evaluates items against new input "X"
	_, err := engine.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	// Should run 2 times.
	if runCount != 2 {
		t.Errorf("Expected 2 runs, got %d. Loop likely failed to resolve items on 2nd iteration.", runCount)
	}
}
