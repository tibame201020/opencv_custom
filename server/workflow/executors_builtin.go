package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// RegisterBuiltinExecutors registers all standard nodes
func init() {
	RegisterExecutor("log", createLogExecutor)
	RegisterExecutor("sleep", createSleepExecutor)
	RegisterExecutor("if_condition", createIfExecutor)
	RegisterExecutor("switch", createSwitchExecutor)
	RegisterExecutor("set_variable", createSetVariableExecutor)
	RegisterExecutor("loop", createLoopExecutor)
	RegisterExecutor("convert", createConvertExecutor)
	RegisterExecutor("sub_workflow", createSubWorkflowExecutor)
	RegisterExecutor("code", createCodeExecutor)
	RegisterExecutor("manual_trigger", createManualTriggerExecutor)
}

func createLogExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	logf := func(format string, args ...interface{}) {
		msg := fmt.Sprintf(format, args...)
		if logger != nil {
			logger(msg)
		} else {
			fmt.Print(msg)
		}
	}

	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// Execute per item, pass through
		for _, item := range arg.Input {
			config := ResolveConfig(rawConfig, arg, &item)
			msg := getConfigStr(config, "message", "")
			level := getConfigStr(config, "type", "info")
			logf("[Workflow][%s] %s", level, msg)
		}
		return singleOutput("success", arg.Input)
	}}
}

func createSleepExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	logf := func(format string, args ...interface{}) {
		msg := fmt.Sprintf(format, args...)
		if logger != nil {
			logger(msg)
		} else {
			fmt.Print(msg)
		}
	}

	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// We sleep once? Or per item?
		// Typically sleep is "wait before proceeding".
		// If we have 100 items, sleeping 1s per item = 100s.
		// n8n 'Wait' node has 'Wait for amount of time' (once) or based on field.
		// Our 'sleep' is simple. Let's do it ONCE based on first item, or max?
		// Let's do: Resolve config using first item (if exists) and sleep once.
		// This matches "Execute Once" behavior roughly.
		var refItem *ExecutionItem
		if len(arg.Input) > 0 {
			refItem = &arg.Input[0]
		}
		config := ResolveConfig(rawConfig, arg, refItem)
		ms := 0
		if val, ok := config["seconds"]; ok {
			switch v := val.(type) {
			case float64:
				ms = int(v * 1000)
			case int:
				ms = v * 1000
			case string:
				if f, err := strconv.ParseFloat(v, 64); err == nil {
					ms = int(f * 1000)
				}
			}
		} else {
			ms = getConfigInt(config, "duration_ms", 1000)
		}

		logf("[Workflow] Sleep %dms", ms)
		select {
		case <-time.After(time.Duration(ms) * time.Millisecond):
			return singleOutput("success", arg.Input)
		case <-ctx.Done():
			logf("[Workflow] Sleep cancelled")
			return singleOutput("cancelled", nil)
		}
	}}
}

func createIfExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		trueItems := ExecutionData{}
		falseItems := ExecutionData{}

		for _, item := range arg.Input {
			config := ResolveConfig(rawConfig, arg, &item)

			operator := getConfigStr(config, "operator", "")
			value1Raw := config["value1"]
			value2Raw := config["value2"]

			// Backward compat
			expression := getConfigStr(config, "expression", "")
			if operator == "" && expression != "" {
				result := false
				if expression != "" && expression != "false" && expression != "0" {
					result = true
				}
				if result {
					trueItems = append(trueItems, item)
				} else {
					falseItems = append(falseItems, item)
				}
				continue
			}

			v1Str := fmt.Sprintf("%v", value1Raw)
			v2Str := fmt.Sprintf("%v", value2Raw)
			result := false

			switch operator {
			case "string:equals":
				result = (v1Str == v2Str)
			case "string:notEquals":
				result = (v1Str != v2Str)
			case "string:contains":
				result = strings.Contains(v1Str, v2Str)
			case "string:notContains":
				result = !strings.Contains(v1Str, v2Str)
			case "string:startsWith":
				result = strings.HasPrefix(v1Str, v2Str)
			case "string:endsWith":
				result = strings.HasSuffix(v1Str, v2Str)
			case "string:isEmpty":
				result = (v1Str == "")
			case "string:isNotEmpty":
				result = (v1Str != "")
			case "number:equals", "number:gt", "number:gte", "number:lt", "number:lte":
				n1, err1 := strconv.ParseFloat(v1Str, 64)
				n2, err2 := strconv.ParseFloat(v2Str, 64)
				if err1 == nil && err2 == nil {
					switch operator {
					case "number:equals":
						result = (n1 == n2)
					case "number:gt":
						result = (n1 > n2)
					case "number:gte":
						result = (n1 >= n2)
					case "number:lt":
						result = (n1 < n2)
					case "number:lte":
						result = (n1 <= n2)
					}
				}
			case "boolean:isTrue":
				result = (v1Str == "true")
			case "boolean:isFalse":
				result = (v1Str == "false")
			default:
				if strings.HasSuffix(operator, ":exists") {
					result = (value1Raw != nil && v1Str != "")
				}
			}

			if result {
				trueItems = append(trueItems, item)
			} else {
				falseItems = append(falseItems, item)
			}
		}

		return NodeOutput{
			Outputs: map[string]ExecutionData{
				"true":  trueItems,
				"false": falseItems,
			},
		}
	}}
}

func createSwitchExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		outputs := make(map[string]ExecutionData)

		for _, item := range arg.Input {
			config := ResolveConfig(rawConfig, arg, &item)
			valueRaw := config["value"]
			mode := getConfigStr(config, "mode", "string")
			valueStr := fmt.Sprintf("%v", valueRaw)

			var casesRaw []interface{}
			if slice, ok := config["cases"].([]interface{}); ok {
				casesRaw = slice
			} else if str, ok := config["cases"].(string); ok {
				var parsed []interface{}
				if err := json.Unmarshal([]byte(str), &parsed); err == nil {
					casesRaw = parsed
				}
			}

			matched := false
			if casesRaw != nil {
				for i, caseValRaw := range casesRaw {
					caseValStr := fmt.Sprintf("%v", caseValRaw)
					match := false
					if mode == "number" {
						n1, err1 := strconv.ParseFloat(valueStr, 64)
						n2, err2 := strconv.ParseFloat(caseValStr, 64)
						if err1 == nil && err2 == nil && n1 == n2 {
							match = true
						}
					} else {
						if valueStr == caseValStr {
							match = true
						}
					}

					if match {
						key := fmt.Sprintf("%d", i)
						outputs[key] = append(outputs[key], item)
						matched = true
						break
					}
				}
			}

			if !matched {
				outputs["default"] = append(outputs["default"], item)
			}
		}
		return NodeOutput{Outputs: outputs}
	}}
}

func createSetVariableExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		var resultItems ExecutionData

		// If no input, create one empty item to allow setting vars
		inputList := arg.Input
		if len(inputList) == 0 {
			inputList = append(inputList, ExecutionItem{JSON: make(map[string]interface{})})
		}

		for _, item := range inputList {
			newItem := ExecutionItem{
				JSON:   make(map[string]interface{}),
				Binary: item.Binary,
			}
			// Copy existing
			for k, v := range item.JSON {
				newItem.JSON[k] = v
			}

			config := ResolveConfig(rawConfig, arg, &item)

			// 1. json_input (Legacy support for raw JSON string)
			if jsonStr, ok := config["json_input"].(string); ok {
				var parsedVars map[string]interface{}
				if err := json.Unmarshal([]byte(jsonStr), &parsedVars); err == nil {
					for k, v := range parsedVars {
						newItem.JSON[k] = v
					}
				}
			}

			// 2. Variables (Flattened from UI key_value editor)
			if vars, ok := config["variables"].(map[string]interface{}); ok {
				for k, v := range vars {
					newItem.JSON[k] = v
				}
			}

			// 3. Direct keys (Backward compatibility or other fields)
			for k, v := range config {
				if k == "json_input" || k == "variables" {
					continue
				}
				newItem.JSON[k] = v
			}
			resultItems = append(resultItems, newItem)
		}

		return singleOutput("success", resultItems)
	}}
}

func createLoopExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// We need to resolve config. But config might depend on input.
		// Let's take the first input item as reference for config.
		var refItem *ExecutionItem
		if len(arg.Input) > 0 {
			refItem = &arg.Input[0]
		}
		config := ResolveConfig(rawConfig, arg, refItem)

		// Check internal state
		idxKey := fmt.Sprintf("loop_%s_index", node.ID)
		idxRaw, exists := arg.GlobalContext[idxKey]
		idx := 0
		if exists {
			idx = idxRaw.(int)
		} else {
			arg.GlobalContext[idxKey] = 0
		}

		itemsRaw := config["items"]
		var items []interface{}

		if itemsRaw != nil {
			if slice, ok := itemsRaw.([]interface{}); ok {
				items = slice
			} else if str, ok := itemsRaw.(string); ok {
				json.Unmarshal([]byte(str), &items)
			}
		} else if val, ok := config["count"]; ok {
			// Generate N items
			count := 0
			switch v := val.(type) {
			case int:
				count = v
			case float64:
				count = int(v)
			}
			for i := 0; i < count; i++ {
				items = append(items, map[string]interface{}{"index": i})
			}
		}

		if len(items) == 0 {
			// No items to loop
			return singleOutput("done", arg.Input)
		}

		if idx >= len(items) {
			delete(arg.GlobalContext, idxKey)
			return singleOutput("done", arg.Input)
		}

		currentItem := items[idx]
		arg.GlobalContext[idxKey] = idx + 1

		// Create output item
		newItem := ExecutionItem{
			JSON: make(map[string]interface{}),
		}
		if m, ok := currentItem.(map[string]interface{}); ok {
			newItem.JSON = m
		} else {
			newItem.JSON["item"] = currentItem
		}
		newItem.JSON["index"] = idx

		return singleOutput("body", ExecutionData{newItem})
	}}
}

func createConvertExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		return singleOutput("success", arg.Input)
	}}
}

func createSubWorkflowExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// Placeholder
		return singleOutput("success", arg.Input)
	}}
}

func createCodeExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	rawConfig := node.Config
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// Resolve config using first item? Or pass unresolved?
		// Code node usually gets raw code string.
		// But user might use expression in code? Unlikely for "code" param.
		// Let's resolve.
		var refItem *ExecutionItem
		if len(arg.Input) > 0 {
			refItem = &arg.Input[0]
		}
		config := ResolveConfig(rawConfig, arg, refItem)
		code := getConfigStr(config, "code", "")

		if bridge == nil {
			return singleOutput("error", ExecutionData{{JSON: map[string]interface{}{"error": "Python bridge not available"}}})
		}

		// Pass inputs as params
		// We pass the raw ExecutionData list structure
		params := map[string]interface{}{
			"code":  code,
			"input": arg.Input, // Contains JSON and Binary maps
		}

		resp, err := bridge.Call("exec_code", params)
		if err != nil {
			return singleOutput("error", ExecutionData{{JSON: map[string]interface{}{"error": err.Error()}}})
		}
		if resp.Error != "" {
			return singleOutput("error", ExecutionData{{JSON: map[string]interface{}{"error": resp.Error}}})
		}

		// Parse Output
		// Expected: Output is either list of objects or single object
		// We need to convert it back to ExecutionData
		var outputData ExecutionData

		// Helper to convert arbitrary Map to ExecutionItem
		toItem := func(val interface{}) ExecutionItem {
			item := ExecutionItem{JSON: make(map[string]interface{})}
			if m, ok := val.(map[string]interface{}); ok {
				// Check if it has 'json'/'binary' structure already?
				// If python returns exact structure, use it.
				if j, hasJ := m["json"]; hasJ {
					if jMap, ok := j.(map[string]interface{}); ok {
						item.JSON = jMap
					}
				} else {
					item.JSON = m
				}
				if b, hasB := m["binary"]; hasB {
					if bMap, ok := b.(map[string]interface{}); ok {
						item.Binary = bMap
					}
				}
			}
			return item
		}

		if list, ok := resp.Output.([]interface{}); ok {
			for _, val := range list {
				outputData = append(outputData, toItem(val))
			}
		} else if resp.Output != nil {
			outputData = append(outputData, toItem(resp.Output))
		}

		return singleOutput("success", outputData)
	}}
}

func createManualTriggerExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor {
	return &FunctionalExecutor{Fn: func(ctx context.Context, arg NodeArg) NodeOutput {
		// Manual Trigger is a pass-through start node.
		// It simply forwards input data (or creates empty item if no input).
		if len(arg.Input) == 0 {
			return singleOutput("success", ExecutionData{{JSON: map[string]interface{}{}}})
		}
		return singleOutput("success", arg.Input)
	}}
}
