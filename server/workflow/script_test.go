package workflow

import (
	"context"
	"testing"
)

func TestWorkflowProofOfFeasibility(t *testing.T) {
	// This test proves that:
	// 1. Workflow can store and retrieve data (set_variable)
	// 2. Expressions can reference data from previous nodes ($node["..."].json)
	// 3. Conditional branching works (if_condition)
	// 4. Multiple items can be processed (implied by design)

	wf := &Workflow{
		ID:   "feasibility_test",
		Name: "Feasibility Test",
		Nodes: map[string]*WorkflowNode{
			"init": {
				ID:   "init",
				Name: "Initialize",
				Type: "set_variable",
				Config: map[string]interface{}{
					"count": 10,
					"user": "tester",
				},
			},
			"check": {
				ID:   "check",
				Name: "Check Count",
				Type: "if_condition",
				Config: map[string]interface{}{
					"value1":   "{{ $node[\"Initialize\"].json.count }}",
					"operator": "number:gt",
					"value2":   "5",
				},
			},
			"success_log": {
				ID:   "success_log",
				Name: "On Success",
				Type: "log",
				Config: map[string]interface{}{
					"message": "User {{ $node[\"Initialize\"].json.user }} passed check",
				},
			},
			"fail_log": {
				ID:   "fail_log",
				Name: "On Fail",
				Type: "log",
				Config: map[string]interface{}{
					"message": "Failed check",
				},
			},
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "init", ToNodeID: "check", Signal: "success"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "success_log", Signal: "true"},
			{ID: "e3", FromNodeID: "check", ToNodeID: "fail_log", Signal: "false"},
		},
		StartNodeID: "init",
	}

	engine := NewFlowEngine(wf)
	WireBuiltinExecutors(wf, nil, nil) // Use built-in executors (Go-side)

	result, err := engine.Execute(context.Background(), nil)
	if err != nil {
		t.Fatalf("Execution failed: %v", err)
	}

	// Verify path
	// Expected: Initialize -> Check Count -> On Success
	expectedPath := []string{"Initialize", "Check Count", "On Success"}
	if len(result.ExecutionPath) != len(expectedPath) {
		t.Errorf("Expected %d steps, got %d", len(expectedPath), len(result.ExecutionPath))
	}

	for i, step := range result.ExecutionPath {
		if i < len(expectedPath) && step.NodeName != expectedPath[i] {
			t.Errorf("Step %d: expected node %s, got %s", i, expectedPath[i], step.NodeName)
		}
	}

	// Verify Data in final step
	lastStep := result.ExecutionPath[len(result.ExecutionPath)-1]
	if lastStep.NodeName != "On Success" {
		t.Fatal("Workflow did not end at 'On Success' node")
	}

	// Verify expressions were resolved
	// The 'log' node in this test environment doesn't store 'message' in output,
	// it just passes input through. We should check if ResolveConfig works.

	initResult := engine.NodeResults["init"]
	checkArg := NodeArg{
		Input: initResult.Outputs["success"],
		NodeResults: engine.NodeResults,
		NodeNames: map[string]string{"init": "Initialize", "check": "Check Count"},
	}

	resolvedLogConfig := ResolveConfig(wf.Nodes["success_log"].Config, checkArg, &checkArg.Input[0])
	expectedMsg := "User tester passed check"
	if resolvedLogConfig["message"] != expectedMsg {
		t.Errorf("Expression failed to resolve. Expected '%s', got '%v'", expectedMsg, resolvedLogConfig["message"])
	}
}
