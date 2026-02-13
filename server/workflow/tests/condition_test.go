package tests

import (
	"context"
	"script-platform/server/workflow"
	"testing"
)

func TestIfConditionWithExpressions(t *testing.T) {
	// Setup Workflow
	wf := &workflow.Workflow{
		ID:          "test_if",
		StartNodeID: "node1",
		Nodes: map[string]*workflow.WorkflowNode{
			"node1": {
				ID:   "node1",
				Type: "if_condition",
				Name: "Check Var",
				Config: map[string]interface{}{
					"value1":   "{{ $vars.count }}",
					"operator": "number:gt",
					"value2":   "10",
				},
			},
		},
		Edges: []workflow.WorkflowEdge{},
	}

	// Setup Engine
	engine := workflow.NewFlowEngine(wf)
	engine.GlobalContext["count"] = 15

	// Run Executor directly
	node := wf.Nodes["node1"]
	workflow.WireBuiltinExecutors(wf, nil, nil) // Wire up executors

	arg := workflow.NodeArg{
		Input:         nil,
		GlobalContext: engine.GlobalContext,
		NodeResults:   engine.NodeResults,
		NodeNames:     map[string]string{"node1": "Check Var"},
	}

	output := node.Executor(context.Background(), arg)

	if output.Signal != "true" {
		t.Errorf("Expected signal=true, got %s", output.Signal)
	}

	// Test False Case
	engine.GlobalContext["count"] = 5
	output = node.Executor(context.Background(), arg)
	if output.Signal != "false" {
		t.Errorf("Expected signal=false, got %s", output.Signal)
	}
}
