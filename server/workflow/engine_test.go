package workflow

import (
	"context"
	"testing"
)

func TestSimpleWorkflow(t *testing.T) {
	wf := &Workflow{
		ID: "wf1",
		Nodes: map[string]*WorkflowNode{
			"n1": CreateConvertNode("n1", "toUpper", func(input interface{}) interface{} {
				return input.(string) + "!"
			}),
			"n2": CreateConvertNode("n2", "twice", func(input interface{}) interface{} {
				return input.(string) + input.(string)
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "n1", ToNodeID: "n2", Signal: "success"},
		},
		StartNodeID: "n1",
	}

	engine := NewFlowEngine(wf)
	result, err := engine.Execute(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	expected := "hello!hello!"
	if result.Output != expected {
		t.Errorf("Expected %s, got %v", expected, result.Output)
	}
}

func TestWorkflowWithIf(t *testing.T) {
	wf := &Workflow{
		ID: "wf2",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "isLength3", func(input interface{}) bool {
				return len(input.(string)) == 3
			}),
			"ok": CreateConvertNode("ok", "prependOK", func(input interface{}) interface{} {
				return "OK:" + input.(string)
			}),
			"fail": CreateConvertNode("fail", "prependFAIL", func(input interface{}) interface{} {
				return "FAIL:" + input.(string)
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "check", ToNodeID: "ok", Signal: "true"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "fail", Signal: "false"},
		},
		StartNodeID: "check",
	}

	engine := NewFlowEngine(wf)

	// Test True path
	res1, _ := engine.Execute(context.Background(), "abc")
	if res1.Output != "OK:abc" {
		t.Errorf("Expected OK:abc, got %v", res1.Output)
	}

	// Test False path
	res2, _ := engine.Execute(context.Background(), "abcd")
	if res2.Output != "FAIL:abcd" {
		t.Errorf("Expected FAIL:abcd, got %v", res2.Output)
	}
}

func TestWhileLoop(t *testing.T) {
	// Equivalent to while(i > 0) { i-- }
	wf := &Workflow{
		ID: "while",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "i > 0", func(input interface{}) bool {
				return input.(int) > 0
			}),
			"dec": CreateConvertNode("dec", "decrement", func(input interface{}) interface{} {
				return input.(int) - 1
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "check", ToNodeID: "dec", Signal: "true"},
			{ID: "e2", FromNodeID: "dec", ToNodeID: "check", Signal: "success"},
		},
		StartNodeID: "check",
	}

	engine := NewFlowEngine(wf)
	result, _ := engine.Execute(context.Background(), 5)
	if result.Output != 0 {
		t.Errorf("Expected 0, got %v", result.Output)
	}

	// Path should be check, dec, check, dec... check (total 6 checks, 5 decs)
	if len(result.ExecutionPath) != 11 {
		t.Errorf("Path length incorrect: %d", len(result.ExecutionPath))
	}
}
