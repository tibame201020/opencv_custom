package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// NodeType 節點類型
type NodeType string

const (
	NodeConvert     NodeType = "CONVERT"
	NodeIf          NodeType = "IF"
	NodeSubWorkflow NodeType = "SUB_WORKFLOW"
	NodeCustom      NodeType = "CUSTOM"
)

// ExecutionItem represents a single item in the data stream (n8n style)
type ExecutionItem struct {
	JSON   map[string]interface{} `json:"json"`
	Binary map[string]interface{} `json:"binary,omitempty"`
}

// ExecutionData represents the list of items
type ExecutionData []ExecutionItem

// NodeOutput 節點執行結果
type NodeOutput struct {
	// Signal string      `json:"signal"` // Deprecated: Use Outputs map
	Outputs map[string]ExecutionData `json:"outputs"`
}

// NodeArg 節點輸入參數
type NodeArg struct {
	Input         ExecutionData          `json:"input"`
	GlobalContext map[string]interface{} `json:"globalContext"`
	NodeResults   map[string]NodeOutput  `json:"nodeResults"`
	NodeNames     map[string]string      `json:"nodeNames"` // ID -> Name mapping
}

// WorkflowNode 工作流節點定義
type WorkflowNode struct {
	ID          string                                            `json:"id"`
	Name        string                                            `json:"name"`
	Type        NodeType                                          `json:"type"`
	Config      map[string]interface{}                            `json:"config"`
	Executor    func(ctx context.Context, arg NodeArg) NodeOutput `json:"-"`
	SubWorkflow *Workflow
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
}

// WorkflowEdge 工作流邊定義
type WorkflowEdge struct {
	ID         string `json:"id"`
	FromNodeID string `json:"fromNodeId"`
	ToNodeID   string `json:"toNodeId"`
	Signal     string `json:"signal"`
}

// Workflow 工作流定義
type Workflow struct {
	ID          string                   `json:"id"`
	ProjectID   string                   `json:"projectId"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	Platform    string                   `json:"platform"`
	Nodes       map[string]*WorkflowNode `json:"nodes"`
	Edges       []WorkflowEdge           `json:"edges"`
	StartNodeID string                   `json:"startNodeId"`
}

// FlowEngine 執行引擎
type FlowEngine struct {
	Workflow      *Workflow
	GlobalContext map[string]interface{}
	NodeResults   map[string]NodeOutput
	OnStep        func(step ExecutionStep)
}

// NewFlowEngine 建立執行引擎
func NewFlowEngine(wf *Workflow) *FlowEngine {
	return &FlowEngine{
		Workflow:      wf,
		GlobalContext: make(map[string]interface{}),
		NodeResults:   make(map[string]NodeOutput),
	}
}

// ExecutionStep 每個節點的執行記錄
type ExecutionStep struct {
	NodeID    string                   `json:"nodeId"`
	NodeName  string                   `json:"nodeName"`
	NodeType  string                   `json:"nodeType"`
	Signal    string                   `json:"signal"` // Primary signal (first one) for compatibility? Or remove?
	Status    string                   `json:"status"` // success, error, cancelled
	StartTime time.Time                `json:"startTime"`
	EndTime   time.Time                `json:"endTime"`
	Duration  int64                    `json:"duration"` // milliseconds
	Output    map[string]ExecutionData `json:"output,omitempty"`
}

// ExecutionResult 執行結果
type ExecutionResult struct {
	Output        map[string]ExecutionData `json:"output"`
	Signal        string                   `json:"signal"` // Deprecated but kept for compat
	ExecutionPath []ExecutionStep          `json:"executionPath"`
}

// findStartNode 自動尋找起始節點（沒有入邊的節點）
func (e *FlowEngine) findStartNode() string {
	if e.Workflow.StartNodeID != "" {
		return e.Workflow.StartNodeID
	}

	hasIncoming := make(map[string]bool)
	for _, edge := range e.Workflow.Edges {
		hasIncoming[edge.ToNodeID] = true
	}

	var bestID string
	var bestY float64 = 1e18
	for id, node := range e.Workflow.Nodes {
		if !hasIncoming[id] {
			if bestID == "" || node.Y < bestY {
				bestID = id
				bestY = node.Y
			}
		}
	}
	return bestID
}

// ── 判斷節點類型是否需要 Python Bridge ──────────────────

// isPlatformNode 需要透過 PythonBridge 呼叫 PlatformService 的節點
func isPlatformNode(nodeType string) bool {
	switch nodeType {
	case "click", "swipe", "type_text", "key_event", "screenshot",
		"find_image", "click_image", "wait_image", "wait_click_image",
		"ocr_text", "ocr_pattern":
		return true
	}
	return false
}

// ── Expression Resolver ──────────────────────────────────

// resolveValue 解析單個值中的表達式
// Updated to support ExecutionItem context if needed, but signature is interface{}
// For now, expressions are evaluated against the *first item* in the input list if accessed via $json?
// Or we need to pass the *current item* being processed.
// We'll update resolveValue signature to take 'item ExecutionItem' later.
// For now, let's keep it but be aware it needs refactoring for per-item resolution.
func resolveValue(val interface{}, arg NodeArg, item *ExecutionItem) interface{} {
	strVal, ok := val.(string)
	if !ok {
		return val
	}

	re := regexp.MustCompile(`\{\{\s*(.*?)\s*\}\}`)
	if !re.MatchString(strVal) {
		return val
	}

	resolvedStr := re.ReplaceAllStringFunc(strVal, func(match string) string {
		expr := strings.TrimSpace(match[2 : len(match)-2])
		return fmt.Sprintf("%v", evaluateExpression(expr, arg, item))
	})

	trimmed := strings.TrimSpace(strVal)
	if re.MatchString(trimmed) && strings.HasPrefix(trimmed, "{{") && strings.HasSuffix(trimmed, "}}") {
		matches := re.FindAllString(trimmed, -1)
		if len(matches) == 1 && matches[0] == trimmed {
			expr := strings.TrimSpace(trimmed[2 : len(trimmed)-2])
			return evaluateExpression(expr, arg, item)
		}
	}

	return resolvedStr
}

// getValueByPath traverses a map/struct using dot notation
func getValueByPath(data interface{}, path string) interface{} {
	if path == "" {
		return data
	}
	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		if m, ok := current.(map[string]interface{}); ok {
			if val, exists := m[part]; exists {
				current = val
			} else {
				return nil
			}
		} else {
			if list, ok := current.([]interface{}); ok {
				if idx, err := strconv.Atoi(part); err == nil && idx >= 0 && idx < len(list) {
					current = list[idx]
				} else {
					return nil
				}
			} else {
				return nil
			}
		}
	}
	return current
}

func evaluateExpression(expr string, arg NodeArg, item *ExecutionItem) interface{} {
	// 1. $vars.path
	if strings.HasPrefix(expr, "$vars.") {
		path := strings.TrimPrefix(expr, "$vars.")
		return getValueByPath(arg.GlobalContext, path)
	}

	// 2. $json.path (Input Item)
	if strings.HasPrefix(expr, "$json.") {
		if item == nil {
			return nil
		}
		path := strings.TrimPrefix(expr, "$json.")
		return getValueByPath(item.JSON, path)
	}

	// 3. $node["Name"].json.path or $node["Name"].output.path
	if strings.HasPrefix(expr, "$node[") {
		closeBracket := strings.Index(expr, "]")
		if closeBracket > 7 {
			rawName := expr[6:closeBracket]
			nodeName := strings.Trim(rawName, "\"'")

			remainder := expr[closeBracket+1:]
			var path string
			if strings.HasPrefix(remainder, ".json.") {
				path = strings.TrimPrefix(remainder, ".json.")
			} else if strings.HasPrefix(remainder, ".output.") {
				path = strings.TrimPrefix(remainder, ".output.")
			} else if remainder == ".json" || remainder == ".output" {
				path = ""
			} else {
				return nil
			}

			var nodeID string
			for id, name := range arg.NodeNames {
				if name == nodeName {
					nodeID = id
					break
				}
			}

			if nodeID != "" {
				if result, ok := arg.NodeResults[nodeID]; ok {
					// Result.Outputs is map[string]ExecutionData
					// We need to decide which output to pick. Usually 'success' or first one?
					// n8n allows $node["Name"].json to get the FIRST item of the MAIN output?
					// Let's assume 'success' or default output.
					// Or merge all?
					// For simplicity: take 'success' output, first item.
					if outData, exists := result.Outputs["success"]; exists && len(outData) > 0 {
						return getValueByPath(outData[0].JSON, path)
					}
					// Fallback to iterating keys?
					for _, outData := range result.Outputs {
						if len(outData) > 0 {
							return getValueByPath(outData[0].JSON, path)
						}
					}
				}
			}
		}
	}

	// Constants
	if expr == "true" {
		return true
	}
	if expr == "false" {
		return false
	}
	if expr == "null" {
		return nil
	}
	if i, err := strconv.Atoi(expr); err == nil {
		return i
	}

	return expr
}

func ResolveConfig(rawConfig map[string]interface{}, arg NodeArg, item *ExecutionItem) map[string]interface{} {
	resolved := make(map[string]interface{})
	for k, v := range rawConfig {
		resolved[k] = resolveValue(v, arg, item)
	}
	return resolved
}

// ── WireBuiltinExecutors ──────────────────────────────────

func WireBuiltinExecutors(wf *Workflow, bridge *PythonBridge, logger func(string)) {
	for _, node := range wf.Nodes {
		if node.Executor != nil {
			continue
		}
		node.Executor = createBuiltinExecutor(node, bridge, logger)
	}
}

// Helper to create single item output
func singleOutput(signal string, data ExecutionData) NodeOutput {
	return NodeOutput{
		Outputs: map[string]ExecutionData{
			signal: data,
		},
	}
}

func createBuiltinExecutor(node *WorkflowNode, bridge *PythonBridge, logger func(string)) func(context.Context, NodeArg) NodeOutput {
	nodeType := string(node.Type)
	rawConfig := node.Config

	logf := func(format string, args ...interface{}) {
		msg := fmt.Sprintf(format, args...)
		if logger != nil {
			logger(msg)
		} else {
			fmt.Print(msg)
		}
	}

	// ── Platform/Vision 節點 (Execute Per Item) ──
	if isPlatformNode(nodeType) {
		return createBridgeExecutor(nodeType, rawConfig, bridge, logf)
	}

	// ── Flow Control / Pure Go 節點 ──
	switch nodeType {

	case "log":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			// Execute per item, pass through
			for _, item := range arg.Input {
				config := ResolveConfig(rawConfig, arg, &item)
				msg := getConfigStr(config, "message", "")
				level := getConfigStr(config, "type", "info")
				logf("[Workflow][%s] %s\n", level, msg)
			}
			return singleOutput("success", arg.Input)
		}

	case "sleep":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
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

			logf("[Workflow] Sleep %dms\n", ms)
			select {
			case <-time.After(time.Duration(ms) * time.Millisecond):
				return singleOutput("success", arg.Input)
			case <-ctx.Done():
				logf("[Workflow] Sleep cancelled\n")
				return singleOutput("cancelled", nil)
			}
		}

	case "if_condition":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
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
		}

	case "switch":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			outputs := make(map[string]ExecutionData)

			// Pre-resolve config? No, config depends on item usually.
			// But 'cases' might be constant.
			// We resolve config per item.

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
		}

	case "set_variable":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
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

				// 1. json_input
				if jsonStr, ok := config["json_input"].(string); ok {
					var parsedVars map[string]interface{}
					if err := json.Unmarshal([]byte(jsonStr), &parsedVars); err == nil {
						for k, v := range parsedVars {
							newItem.JSON[k] = v
						}
					}
				}

				// 2. Direct keys
				for k, v := range config {
					if k == "json_input" {
						continue
					}
					newItem.JSON[k] = v
				}
				resultItems = append(resultItems, newItem)
			}

			return singleOutput("success", resultItems)
		}

	case "loop":
		// Simplified Loop: Iterate over list field OR count
		// For now, let's assume it behaves like n8n's "Loop Over Items" if input has items.
		// BUT the user interface has 'count' mode.
		// If mode='count', we generate N items?

		return func(ctx context.Context, arg NodeArg) NodeOutput {
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

			// Mode: count or ...?
			// The original code handled "items" array iteration.
			// Let's support:
			// 1. "items" array in config (loop over that)
			// 2. "count" (loop N times)

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
				case int: count = v
				case float64: count = int(v)
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
			// n8n Loop output is the item itself.
			// If item is object, it becomes JSON.
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
		}

	case "convert":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			return singleOutput("success", arg.Input)
		}

	case "sub_workflow":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			// Placeholder
			return singleOutput("success", arg.Input)
		}

	case "code":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
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
		}

	default:
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			return singleOutput("success", arg.Input)
		}
	}
}

// createBridgeExecutor 建立透過 PythonBridge 執行的 Executor
func createBridgeExecutor(nodeType string, rawConfig map[string]interface{}, bridge *PythonBridge, logf func(string, ...interface{})) func(context.Context, NodeArg) NodeOutput {
	return func(ctx context.Context, arg NodeArg) NodeOutput {
		if bridge == nil {
			logf("[Workflow] No bridge, stubbing %s\n", nodeType)
			return singleOutput("success", ExecutionData{{JSON: map[string]interface{}{"stub": true}}})
		}

		var resultItems ExecutionData

		for _, item := range arg.Input {
			if ctx.Err() != nil {
				break
			}

			config := ResolveConfig(rawConfig, arg, &item)
			params := make(map[string]interface{})
			for k, v := range config {
				params[k] = v
			}

			logf("[Workflow] Bridge call: %s\n", nodeType)

			resp, err := bridge.Call(nodeType, params)

			newItem := ExecutionItem{
				JSON: make(map[string]interface{}),
			}

			if err != nil {
				newItem.JSON["error"] = err.Error()
			} else if resp.Error != "" {
				newItem.JSON["error"] = resp.Error
			} else {
				if resp.Output != nil {
					// Merge output into item? Or replace?
					// n8n Actions usually return new data (e.g. click result).
					// Sometimes they append.
					// Let's assume Output is the new JSON content.
					if outMap, ok := resp.Output.(map[string]interface{}); ok {
						newItem.JSON = outMap
					} else {
						newItem.JSON["result"] = resp.Output
					}
				}
			}
			resultItems = append(resultItems, newItem)
		}

		return singleOutput("success", resultItems)
	}
}

// ── Config helpers ───────────────────────────────────────

func getConfigStr(config map[string]interface{}, key, fallback string) string {
	if v, ok := config[key]; ok {
		return fmt.Sprintf("%v", v)
	}
	return fallback
}

func getConfigInt(config map[string]interface{}, key string, fallback int) int {
	if v, ok := config[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		case int64:
			return int(n)
		}
	}
	return fallback
}

// ── Execute ─────────────────────────────────────────────

func (e *FlowEngine) Execute(ctx context.Context, input interface{}) (*ExecutionResult, error) {
	// Initialize Start Data
	var startData ExecutionData

	// Convert initial input interface{} to ExecutionData
	if input != nil {
		if d, ok := input.(ExecutionData); ok {
			startData = d
		} else if m, ok := input.(map[string]interface{}); ok {
			startData = ExecutionData{{JSON: m}}
		} else {
			// Wrap primitive?
			startData = ExecutionData{{JSON: map[string]interface{}{"value": input}}}
		}
	} else {
		startData = ExecutionData{{JSON: map[string]interface{}{}}}
	}

	executionPath := []ExecutionStep{}
	e.NodeResults = make(map[string]NodeOutput)

	// Queue for BFS/Execution: (NodeID, InputData)
	type QueueItem struct {
		NodeID string
		Data   ExecutionData
	}

	queue := []QueueItem{}

	startNodeID := e.findStartNode()
	if startNodeID == "" {
		return &ExecutionResult{Output: map[string]ExecutionData{}, ExecutionPath: executionPath}, fmt.Errorf("no start node")
	}

	queue = append(queue, QueueItem{NodeID: startNodeID, Data: startData})

	// To prevent infinite loops in cyclic graphs without consumption, we might need logic.
	// But 'Loop' node handles cycle control. Standard nodes just forward.
	// We iterate until queue empty.

	// Output of the workflow (leaf nodes?)
	// or the last executed node?
	// We'll return the accumulated results of all leaf executions?
	// For simplicity, return the data of the last executed step.
	finalOutput := map[string]ExecutionData{}

	// Pre-calculate Node Names
	nodeNames := make(map[string]string)
	for id, node := range e.Workflow.Nodes {
		nodeNames[id] = node.Name
	}

	for len(queue) > 0 {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// Pop
		currentItem := queue[0]
		queue = queue[1:]
		currentNodeId := currentItem.NodeID
		currentData := currentItem.Data

		node, ok := e.Workflow.Nodes[currentNodeId]
		if !ok {
			continue
		}

		arg := NodeArg{
			Input:         currentData,
			GlobalContext: e.GlobalContext,
			NodeResults:   e.NodeResults,
			NodeNames:     nodeNames,
		}

		startTime := time.Now()
		var nodeOutput NodeOutput

		if node.Type == NodeSubWorkflow && node.SubWorkflow != nil {
			// Subworkflow logic (stub)
			nodeOutput = singleOutput("success", currentData)
		} else if node.Executor != nil {
			nodeOutput = node.Executor(ctx, arg)
		} else {
			// No executor? Skip?
			continue
		}

		endTime := time.Now()
		duration := endTime.Sub(startTime).Milliseconds()

		e.NodeResults[node.ID] = nodeOutput

		// Determine generic status
		status := "success"
		if _, hasError := nodeOutput.Outputs["error"]; hasError {
			status = "error"
		}

		step := ExecutionStep{
			NodeID:    node.ID,
			NodeName:  node.Name,
			NodeType:  string(node.Type),
			Status:    status,
			StartTime: startTime,
			EndTime:   endTime,
			Duration:  duration,
			Output:    nodeOutput.Outputs,
		}

		// If only one output 'success', set Signal for compat?
		for s := range nodeOutput.Outputs {
			step.Signal = s
			break
		}

		executionPath = append(executionPath, step)
		if e.OnStep != nil {
			e.OnStep(step)
		}

		// Update Final Output (last step wins)
		finalOutput = nodeOutput.Outputs

		// Enqueue Next Nodes
		for signal, outData := range nodeOutput.Outputs {
			// Only propagate if there is data (Standard n8n behavior: stop if empty)
			if len(outData) == 0 {
				continue
			}

			// Find edges from this node with this signal
			for _, edge := range e.Workflow.Edges {
				if edge.FromNodeID == currentNodeId && (edge.Signal == signal || edge.Signal == "") {
					// edge.Signal == "" implies wildcard/default connection?
					// Usually edges have signals.
					queue = append(queue, QueueItem{
						NodeID: edge.ToNodeID,
						Data:   outData,
					})
				}
			}
		}
	}

	return &ExecutionResult{
		Output:        finalOutput,
		ExecutionPath: executionPath,
	}, nil
}
