package tests

import (
	"script-platform/server/workflow"
	"testing"
)

func TestExpressionResolver(t *testing.T) {
	// Setup Context
	globalContext := map[string]interface{}{
		"myVar": "Hello World",
		"count": 123,
	}

	nodeResults := map[string]workflow.NodeOutput{
		"node1": {
			Output: map[string]interface{}{
				"foo": "bar",
				"nested": map[string]interface{}{
					"val": 42,
				},
			},
		},
	}

	nodeNames := map[string]string{
		"node1": "My Source Node",
	}

	arg := workflow.NodeArg{
		Input:         map[string]interface{}{"inputKey": "inputValue"},
		GlobalContext: globalContext,
		NodeResults:   nodeResults,
		NodeNames:     nodeNames,
	}

	// Test Cases
	tests := []struct {
		name     string
		config   map[string]interface{}
		expected map[string]interface{}
	}{
		{
			name: "Resolve Global Var",
			config: map[string]interface{}{
				"test": "{{ $vars.myVar }}",
			},
			expected: map[string]interface{}{
				"test": "Hello World",
			},
		},
		{
			name: "Resolve Input",
			config: map[string]interface{}{
				"test": "{{ $json.inputKey }}",
			},
			expected: map[string]interface{}{
				"test": "inputValue",
			},
		},
		{
			name: "Resolve Node Output",
			config: map[string]interface{}{
				"test": "{{ $node[\"My Source Node\"].json.foo }}",
			},
			expected: map[string]interface{}{
				"test": "bar",
			},
		},
		{
			name: "Resolve Mixed",
			config: map[string]interface{}{
				"msg": "Value is {{ $vars.count }}",
			},
			expected: map[string]interface{}{
				"msg": "Value is 123",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resolved := workflow.ResolveConfig(tt.config, arg)
			if val, ok := resolved["test"]; ok {
				if val != tt.expected["test"] {
					t.Errorf("Expected test=%v, got %v", tt.expected["test"], val)
				}
			}
			if val, ok := resolved["msg"]; ok {
				if val != tt.expected["msg"] {
					t.Errorf("Expected msg=%v, got %v", tt.expected["msg"], val)
				}
			}
		})
	}
}
