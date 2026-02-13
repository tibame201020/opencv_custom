package tests

import (
	"context"
	"script-platform/server/workflow"
	"testing"
)

func TestSetVariableScope(t *testing.T) {
	// Setup Workflow
	wf := &workflow.Workflow{
		ID:          "test_vars_scope",
		StartNodeID: "node1",
		Nodes: map[string]*workflow.WorkflowNode{
			"node1": {
				ID:   "node1",
				Type: "set_variable",
				Name: "Set Scope Vars",
				Config: map[string]interface{}{
					"json_input": "{\"scoped_count\": 500}",
					"direct_val": "direct",
				},
			},
		},
	}

	engine := workflow.NewFlowEngine(wf)
	workflow.WireBuiltinExecutors(wf, nil, nil)

	node := wf.Nodes["node1"]

	// Initial Input
	initialInput := map[string]interface{}{
		"existing_data": "preserved",
	}

	arg := workflow.NodeArg{
		Input:         initialInput,
		GlobalContext: engine.GlobalContext,
	}

	output := node.Executor(context.Background(), arg)

	// Check Output (Data Stream)
	outMap, ok := output.Output.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected output to be map[string]interface{}, got %T", output.Output)
	}

	// Verify new variables are in stream
	if outMap["scoped_count"] != 500.0 {
		t.Errorf("Expected scoped_count=500 in output, got %v", outMap["scoped_count"])
	}
	if outMap["direct_val"] != "direct" {
		t.Errorf("Expected direct_val=direct in output, got %v", outMap["direct_val"])
	}

	// Verify existing input is preserved (Merge behavior)
	if outMap["existing_data"] != "preserved" {
		t.Errorf("Expected existing_data=preserved in output, got %v", outMap["existing_data"])
	}

	// Verify GlobalContext is NOT polluted (unless we explicitly enabled it, which we commented out)
	if _, exists := engine.GlobalContext["scoped_count"]; exists {
		t.Errorf("Did not expect scoped_count in GlobalContext")
	}
}
