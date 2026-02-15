package workflow

import (
	"context"
	"testing"
)

// Helper to extract single value from ExecutionData
func getFirstValue(data ExecutionData) interface{} {
	if len(data) == 0 {
		return nil
	}
	// Check "value" key or return whole map
	if v, ok := data[0].JSON["value"]; ok {
		return v
	}
	return data[0].JSON
}

// ── Test 1: Simple Convert ──────────────────────────────

func TestSimpleConvert(t *testing.T) {
	wf := &Workflow{
		ID: "simple",
		Nodes: map[string]*WorkflowNode{
			"n1": CreateConvertNode("n1", "toUpper", func(input interface{}) interface{} {
				// input is map[string]interface{}
				m := input.(map[string]interface{})
				val := m["value"].(string)
				return val + "!"
			}),
			"n2": CreateConvertNode("n2", "appendHash", func(input interface{}) interface{} {
				m := input.(map[string]interface{})
				val := m["value"].(string)
				return val + "#"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "n1", ToNodeID: "n2", Signal: "success"},
		},
		StartNodeID: "n1",
	}

	// Execute with primitive "hello", engine wraps it in {"value": "hello"}
	result, err := NewFlowEngine(wf).Execute(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	outputData := result.Output["success"]
	finalVal := getFirstValue(outputData)
	expected := "hello!#"

	if finalVal != expected {
		t.Errorf("Expected %s, got %v", expected, finalVal)
	}
}

// ── Test 2: If Condition ────────────────────────────────

func TestIfCondition(t *testing.T) {
	wf := &Workflow{
		ID: "if_test",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "isLength3", func(input interface{}) bool {
				m := input.(map[string]interface{})
				val := m["value"].(string)
				return len(val) == 3
			}),
			"ok": CreateConvertNode("ok", "prependOK", func(input interface{}) interface{} {
				m := input.(map[string]interface{})
				val := m["value"].(string)
				return "OK:" + val
			}),
			"fail": CreateConvertNode("fail", "prependFAIL", func(input interface{}) interface{} {
				m := input.(map[string]interface{})
				val := m["value"].(string)
				return "FAIL:" + val
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "check", ToNodeID: "ok", Signal: "true"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "fail", Signal: "false"},
		},
		StartNodeID: "check",
	}

	engine := NewFlowEngine(wf)

	// True path
	res1, _ := engine.Execute(context.Background(), "abc")
	val1 := getFirstValue(res1.Output["success"])
	if val1 != "OK:abc" {
		t.Errorf("Expected OK:abc, got %v", val1)
	}

	// False path
	res2, _ := engine.Execute(context.Background(), "abcd")
	val2 := getFirstValue(res2.Output["success"])
	if val2 != "FAIL:abcd" {
		t.Errorf("Expected FAIL:abcd, got %v", val2)
	}
}

// ── Test 6: Case When (Multi-Signal Branching) ──────────

func TestCaseWhenBranching(t *testing.T) {
	wf := &Workflow{
		ID: "case_when",
		Nodes: map[string]*WorkflowNode{
			"switch": createCustomNode("switch", "categorizeLength", func(ctx context.Context, arg NodeArg) NodeOutput {
				outputs := map[string]ExecutionData{}

				for _, item := range arg.Input {
					s := item.JSON["value"].(string)
					var signal string
					if len(s) < 3 {
						signal = "short"
					} else if len(s) < 6 {
						signal = "medium"
					} else {
						signal = "long"
					}
					outputs[signal] = append(outputs[signal], item)
				}
				return NodeOutput{Outputs: outputs}
			}),
			"hShort": CreateConvertNode("hShort", "handleShort", func(input interface{}) interface{} {
				return "SHORT: " + input.(map[string]interface{})["value"].(string)
			}),
			"hMed": CreateConvertNode("hMed", "handleMedium", func(input interface{}) interface{} {
				return "MEDIUM: " + input.(map[string]interface{})["value"].(string)
			}),
			"hLong": CreateConvertNode("hLong", "handleLong", func(input interface{}) interface{} {
				return "LONG: " + input.(map[string]interface{})["value"].(string)
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "switch", ToNodeID: "hShort", Signal: "short"},
			{ID: "e2", FromNodeID: "switch", ToNodeID: "hMed", Signal: "medium"},
			{ID: "e3", FromNodeID: "switch", ToNodeID: "hLong", Signal: "long"},
		},
		StartNodeID: "switch",
	}

	tests := []struct {
		input    string
		expected string
	}{
		{"hi", "SHORT: hi"},
		{"hello", "MEDIUM: hello"},
		{"extraordinarily", "LONG: extraordinarily"},
	}

	for _, tt := range tests {
		result, err := NewFlowEngine(wf).Execute(context.Background(), tt.input)
		if err != nil {
			t.Fatalf("Input '%s' failed: %v", tt.input, err)
		}
		val := getFirstValue(result.Output["success"])
		if val != tt.expected {
			t.Errorf("Input '%s': expected '%s', got '%v'", tt.input, tt.expected, val)
		}
	}
}

func createCustomNode(id, name string, executor func(context.Context, NodeArg) NodeOutput) *WorkflowNode {
	return &WorkflowNode{
		ID:       id,
		Name:     name,
		Type:     NodeCustom,
		Executor: executor,
	}
}
