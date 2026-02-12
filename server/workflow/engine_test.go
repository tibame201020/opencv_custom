package workflow

import (
	"context"
	"testing"
)

// ── Test 1: Simple Convert ──────────────────────────────

func TestSimpleConvert(t *testing.T) {
	wf := &Workflow{
		ID: "simple",
		Nodes: map[string]*WorkflowNode{
			"n1": CreateConvertNode("n1", "toUpper", func(input interface{}) interface{} {
				return input.(string) + "!"
			}),
			"n2": CreateConvertNode("n2", "appendHash", func(input interface{}) interface{} {
				return input.(string) + "#"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "n1", ToNodeID: "n2", Signal: "success"},
		},
		StartNodeID: "n1",
	}

	result, err := NewFlowEngine(wf).Execute(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}
	expected := "hello!#"
	if result.Output != expected {
		t.Errorf("Expected %s, got %v", expected, result.Output)
	}
	if result.Signal != "success" {
		t.Errorf("Expected signal 'success', got '%s'", result.Signal)
	}
}

// ── Test 2: If Condition ────────────────────────────────

func TestIfCondition(t *testing.T) {
	wf := &Workflow{
		ID: "if_test",
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

	// True path
	res1, _ := engine.Execute(context.Background(), "abc")
	if res1.Output != "OK:abc" {
		t.Errorf("Expected OK:abc, got %v", res1.Output)
	}

	// False path
	res2, _ := engine.Execute(context.Background(), "abcd")
	if res2.Output != "FAIL:abcd" {
		t.Errorf("Expected FAIL:abcd, got %v", res2.Output)
	}
}

// ── Test 3: While Loop (Back-edge) ──────────────────────

func TestWhileLoop(t *testing.T) {
	wf := &Workflow{
		ID: "while",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "i > 0", func(input interface{}) bool {
				return input.(int) > 0
			}),
			"body": CreateConvertNode("body", "decrement", func(input interface{}) interface{} {
				return input.(int) - 1
			}),
			"done": CreateConvertNode("done", "finalize", func(input interface{}) interface{} {
				return "Blast off!"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "check", ToNodeID: "body", Signal: "true"},
			{ID: "e2", FromNodeID: "body", ToNodeID: "check", Signal: "success"}, // Back-edge
			{ID: "e3", FromNodeID: "check", ToNodeID: "done", Signal: "false"},
		},
		StartNodeID: "check",
	}

	result, _ := NewFlowEngine(wf).Execute(context.Background(), 5)
	if result.Output != "Blast off!" {
		t.Errorf("Expected 'Blast off!', got %v", result.Output)
	}
	// Path: check,body,check,body,check,body,check,body,check,body,check,done = 12 steps
	if len(result.ExecutionPath) != 12 {
		t.Errorf("Path length: expected 12, got %d", len(result.ExecutionPath))
	}
	if result.Signal != "success" {
		t.Errorf("Expected signal 'success', got '%s'", result.Signal)
	}
}

// ── Test 4: For Loop (Fixed Count) ─────────────────────

type forState struct {
	I     int
	Limit int
	Acc   string
}

func TestForLoopFixedCount(t *testing.T) {
	wf := &Workflow{
		ID: "for_loop",
		Nodes: map[string]*WorkflowNode{
			"init": CreateConvertNode("init", "init(i=0)", func(input interface{}) interface{} {
				limit := input.(int)
				return forState{I: 0, Limit: limit, Acc: ""}
			}),
			"check": CreateIfNode("check", "i < limit?", func(input interface{}) bool {
				s := input.(forState)
				return s.I < s.Limit
			}),
			"body": CreateConvertNode("body", "appendStep", func(input interface{}) interface{} {
				s := input.(forState)
				return forState{I: s.I + 1, Limit: s.Limit, Acc: s.Acc + "[" + string(rune('0'+s.I)) + "]"}
			}),
			"done": CreateConvertNode("done", "getResult", func(input interface{}) interface{} {
				return input.(forState).Acc
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "init", ToNodeID: "check", Signal: "success"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "body", Signal: "true"},
			{ID: "e3", FromNodeID: "body", ToNodeID: "check", Signal: "success"}, // Back-edge
			{ID: "e4", FromNodeID: "check", ToNodeID: "done", Signal: "false"},
		},
		StartNodeID: "init",
	}

	result, err := NewFlowEngine(wf).Execute(context.Background(), 3)
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}
	expected := "[0][1][2]"
	if result.Output != expected {
		t.Errorf("Expected '%s', got '%v'", expected, result.Output)
	}
}

// ── Test 5: For Each Collection ─────────────────────────

type forEachState struct {
	Items     []string
	Index     int
	Processed []string
}

func TestForEachCollection(t *testing.T) {
	wf := &Workflow{
		ID: "for_each",
		Nodes: map[string]*WorkflowNode{
			"init": CreateConvertNode("init", "prepare", func(input interface{}) interface{} {
				items := input.([]string)
				return forEachState{Items: items, Index: 0, Processed: []string{}}
			}),
			"check": CreateIfNode("check", "hasMore?", func(input interface{}) bool {
				s := input.(forEachState)
				return s.Index < len(s.Items)
			}),
			"process": CreateConvertNode("process", "toUpper", func(input interface{}) interface{} {
				s := input.(forEachState)
				item := s.Items[s.Index]
				newProcessed := append(append([]string{}, s.Processed...), item+"!")
				return forEachState{Items: s.Items, Index: s.Index + 1, Processed: newProcessed}
			}),
			"done": CreateConvertNode("done", "finalList", func(input interface{}) interface{} {
				return input.(forEachState).Processed
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "init", ToNodeID: "check", Signal: "success"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "process", Signal: "true"},
			{ID: "e3", FromNodeID: "process", ToNodeID: "check", Signal: "success"}, // Back-edge
			{ID: "e4", FromNodeID: "check", ToNodeID: "done", Signal: "false"},
		},
		StartNodeID: "init",
	}

	result, err := NewFlowEngine(wf).Execute(context.Background(), []string{"apple", "banana", "cherry"})
	if err != nil {
		t.Fatalf("Workflow failed: %v", err)
	}

	output := result.Output.([]string)
	expected := []string{"apple!", "banana!", "cherry!"}
	if len(output) != len(expected) {
		t.Fatalf("Expected %d items, got %d", len(expected), len(output))
	}
	for i, v := range expected {
		if output[i] != v {
			t.Errorf("Item %d: expected '%s', got '%s'", i, v, output[i])
		}
	}
}

// ── Test 6: Case When (Multi-Signal Branching) ──────────

func TestCaseWhenBranching(t *testing.T) {
	wf := &Workflow{
		ID: "case_when",
		Nodes: map[string]*WorkflowNode{
			"switch": createCustomNode("switch", "categorizeLength", func(ctx context.Context, arg NodeArg) NodeOutput {
				s := arg.Input.(string)
				if len(s) < 3 {
					return NodeOutput{Signal: "short", Output: s}
				}
				if len(s) < 6 {
					return NodeOutput{Signal: "medium", Output: s}
				}
				return NodeOutput{Signal: "long", Output: s}
			}),
			"hShort": CreateConvertNode("hShort", "handleShort", func(input interface{}) interface{} {
				return "SHORT: " + input.(string)
			}),
			"hMed": CreateConvertNode("hMed", "handleMedium", func(input interface{}) interface{} {
				return "MEDIUM: " + input.(string)
			}),
			"hLong": CreateConvertNode("hLong", "handleLong", func(input interface{}) interface{} {
				return "LONG: " + input.(string)
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
		if result.Output != tt.expected {
			t.Errorf("Input '%s': expected '%s', got '%v'", tt.input, tt.expected, result.Output)
		}
	}
}

// ── Test 7: Nested Subflow ──────────────────────────────

func TestNestedSubflow(t *testing.T) {
	// Level 2: SubB — wrap with B()
	subB := &Workflow{
		ID: "subB",
		Nodes: map[string]*WorkflowNode{
			"b1": CreateConvertNode("b1", "bInit", func(input interface{}) interface{} {
				return "B(" + input.(string) + ")"
			}),
		},
		StartNodeID: "b1",
	}

	// Level 1: SubA — calls SubB then wraps with A[]
	subA := &Workflow{
		ID: "subA",
		Nodes: map[string]*WorkflowNode{
			"a1": {ID: "a1", Name: "callSubB", Type: NodeSubWorkflow, SubWorkflow: subB},
			"a2": CreateConvertNode("a2", "wrapA", func(input interface{}) interface{} {
				return "A[" + input.(string) + "]"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "ae1", FromNodeID: "a1", ToNodeID: "a2", Signal: "success"},
		},
		StartNodeID: "a1",
	}

	// Level 0: Parent — calls SubA then wraps with P{}
	parent := &Workflow{
		ID: "parent",
		Nodes: map[string]*WorkflowNode{
			"p1": {ID: "p1", Name: "callSubA", Type: NodeSubWorkflow, SubWorkflow: subA},
			"p2": CreateConvertNode("p2", "wrapParent", func(input interface{}) interface{} {
				return "P{" + input.(string) + "}"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "pe1", FromNodeID: "p1", ToNodeID: "p2", Signal: "success"},
		},
		StartNodeID: "p1",
	}

	result, err := NewFlowEngine(parent).Execute(context.Background(), "input")
	if err != nil {
		t.Fatalf("Nested subflow failed: %v", err)
	}

	expected := "P{A[B(input)]}"
	if result.Output != expected {
		t.Errorf("Expected '%s', got '%v'", expected, result.Output)
	}

	// Parent execution path should only show parent-level nodes
	if len(result.ExecutionPath) != 2 {
		t.Errorf("Expected execution path length 2 (p1, p2), got %d", len(result.ExecutionPath))
	}
}

// ── Test 8: Sub-Workflow Signal Propagation ──────────────

func TestSubWorkflowSignalPropagation(t *testing.T) {
	// SubWorkflow with If — terminates with either "true" or "false" signal
	sub := &Workflow{
		ID: "sub_if",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "isPositive?", func(input interface{}) bool {
				return input.(int) > 0
			}),
			"validPath": CreateConvertNode("validPath", "markValid", func(input interface{}) interface{} {
				return "VALID"
			}),
			"invalidPath": CreateConvertNode("invalidPath", "markInvalid", func(input interface{}) interface{} {
				return "INVALID"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "e1", FromNodeID: "check", ToNodeID: "validPath", Signal: "true"},
			{ID: "e2", FromNodeID: "check", ToNodeID: "invalidPath", Signal: "false"},
		},
		StartNodeID: "check",
	}

	// Parent uses the sub-workflow's terminal signal to branch
	parent := &Workflow{
		ID: "parent",
		Nodes: map[string]*WorkflowNode{
			"callSub": {ID: "callSub", Name: "validator", Type: NodeSubWorkflow, SubWorkflow: sub},
			"onSuccess": CreateConvertNode("onSuccess", "appendOK", func(input interface{}) interface{} {
				return input.(string) + " → OK"
			}),
			"onFail": CreateConvertNode("onFail", "appendFAIL", func(input interface{}) interface{} {
				return input.(string) + " → REJECTED"
			}),
		},
		Edges: []WorkflowEdge{
			// Sub-workflow terminates at "validPath" with signal "success"
			// or at "invalidPath" with signal "success"
			// Both end with "success" since they are ConvertNodes
			{ID: "pe1", FromNodeID: "callSub", ToNodeID: "onSuccess", Signal: "success"},
		},
		StartNodeID: "callSub",
	}

	// Test positive
	res1, err := NewFlowEngine(parent).Execute(context.Background(), 1)
	if err != nil {
		t.Fatalf("Positive case failed: %v", err)
	}
	if res1.Output != "VALID → OK" {
		t.Errorf("Expected 'VALID → OK', got '%v'", res1.Output)
	}

	// Test negative — sub-workflow still terminates with "success" signal (Convert node returns "success")
	res2, err := NewFlowEngine(parent).Execute(context.Background(), -1)
	if err != nil {
		t.Fatalf("Negative case failed: %v", err)
	}
	if res2.Output != "INVALID → OK" {
		t.Errorf("Expected 'INVALID → OK', got '%v'", res2.Output)
	}
}

// ── Test 9: Sub-Workflow If Terminal Signal Propagation ──

func TestSubWorkflowIfTerminalSignal(t *testing.T) {
	// SubWorkflow that ends on an If node (terminal signal is "true" or "false")
	sub := &Workflow{
		ID: "sub_if_terminal",
		Nodes: map[string]*WorkflowNode{
			"check": CreateIfNode("check", "isPositive?", func(input interface{}) bool {
				return input.(int) > 0
			}),
		},
		StartNodeID: "check",
	}

	// Parent branches based on the If node's signal
	parent := &Workflow{
		ID: "parent",
		Nodes: map[string]*WorkflowNode{
			"callSub": {ID: "callSub", Name: "validator", Type: NodeSubWorkflow, SubWorkflow: sub},
			"onTrue": CreateConvertNode("onTrue", "trueHandler", func(input interface{}) interface{} {
				return "POSITIVE"
			}),
			"onFalse": CreateConvertNode("onFalse", "falseHandler", func(input interface{}) interface{} {
				return "NEGATIVE"
			}),
		},
		Edges: []WorkflowEdge{
			{ID: "pe1", FromNodeID: "callSub", ToNodeID: "onTrue", Signal: "true"},
			{ID: "pe2", FromNodeID: "callSub", ToNodeID: "onFalse", Signal: "false"},
		},
		StartNodeID: "callSub",
	}

	// True path — sub-workflow If evaluates to true
	res1, err := NewFlowEngine(parent).Execute(context.Background(), 5)
	if err != nil {
		t.Fatalf("True case failed: %v", err)
	}
	if res1.Output != "POSITIVE" {
		t.Errorf("Expected 'POSITIVE', got '%v'", res1.Output)
	}

	// False path — sub-workflow If evaluates to false
	res2, err := NewFlowEngine(parent).Execute(context.Background(), -3)
	if err != nil {
		t.Fatalf("False case failed: %v", err)
	}
	if res2.Output != "NEGATIVE" {
		t.Errorf("Expected 'NEGATIVE', got '%v'", res2.Output)
	}
}

// Note: CreateConvertNode, CreateIfNode are defined in executor.go
// CreateCustomNode is also needed but not in executor.go, so we define it here.

func createCustomNode(id, name string, executor func(context.Context, NodeArg) NodeOutput) *WorkflowNode {
	return &WorkflowNode{
		ID:       id,
		Name:     name,
		Type:     NodeCustom,
		Executor: executor,
	}
}
