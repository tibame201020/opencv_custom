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

// Scope 變數作用域
type Scope struct {
	Variables map[string]interface{}
	Parent    *Scope
}

func (s *Scope) Get(key string) (interface{}, bool) {
	if val, ok := s.Variables[key]; ok {
		return val, true
	}
	if s.Parent != nil {
		return s.Parent.Get(key)
	}
	return nil, false
}

func (s *Scope) Set(key string, val interface{}) {
	s.Variables[key] = val
}

// NodeOutput 節點執行結果
type NodeOutput struct {
	Signal      string                 `json:"signal"`
	Output      interface{}            `json:"output"`
	ScopeAction string                 `json:"-"` // "push", "pop"
	ScopeData   map[string]interface{} `json:"-"` // Initial variables for new scope
}

// NodeArg 節點輸入參數
type NodeArg struct {
	Input       interface{}           `json:"input"`
	Scope       *Scope                `json:"scope"`
	NodeResults map[string]NodeOutput `json:"nodeResults"`
	NodeNames   map[string]string     `json:"nodeNames"` // ID -> Name mapping
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
	Workflow    *Workflow
	RootScope   *Scope
	CurrentScope *Scope
	NodeResults map[string]NodeOutput
	OnStep      func(step ExecutionStep)
}

// NewFlowEngine 建立執行引擎
func NewFlowEngine(wf *Workflow) *FlowEngine {
	rootScope := &Scope{
		Variables: make(map[string]interface{}),
		Parent:    nil,
	}
	return &FlowEngine{
		Workflow:    wf,
		RootScope:   rootScope,
		CurrentScope: rootScope,
		NodeResults: make(map[string]NodeOutput),
	}
}

// ExecutionStep 每個節點的執行記錄
type ExecutionStep struct {
	NodeID   string      `json:"nodeId"`
	NodeName string      `json:"nodeName"`
	NodeType string      `json:"nodeType"`
	Signal   string      `json:"signal"`
	Input    interface{} `json:"input,omitempty"`
	Output   interface{} `json:"output,omitempty"`
}

// ExecutionResult 執行結果
type ExecutionResult struct {
	Output        interface{}     `json:"output"`
	Signal        string          `json:"signal"`
	ExecutionPath []ExecutionStep `json:"executionPath"`
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
func resolveValue(val interface{}, arg NodeArg) interface{} {
	strVal, ok := val.(string)
	if !ok {
		return val
	}

	// Regex to find {{ ... }}
	// Supported formats:
	// {{ $vars.myVar }}
	// {{ $json.myField }}
	// {{ $node["Node Name"].json.field }}
	re := regexp.MustCompile(`\{\{\s*(.*?)\s*\}\}`)

	if !re.MatchString(strVal) {
		return val
	}

	// Replace all occurrences
	resolvedStr := re.ReplaceAllStringFunc(strVal, func(match string) string {
		// Extract inner content: $vars.foo or $node["..."]...
		// Remove {{ and }} and trim spaces
		expr := strings.TrimSpace(match[2 : len(match)-2])
		return fmt.Sprintf("%v", evaluateExpression(expr, arg))
	})

	// If the entire string was the expression, attempt to return original type if possible?
	// For now, regex replacement always returns string.
	// If the original string was EXACTLY the expression "{{ ... }}", we might want to return the raw value
	// instead of stringifying it.
	// Example: "{{ $vars.obj }}" where obj is a map.
	// Current implementation stringifies it.
	// Let's check exact match.
	trimmed := strings.TrimSpace(strVal)
	if re.MatchString(trimmed) && strings.HasPrefix(trimmed, "{{") && strings.HasSuffix(trimmed, "}}") {
		// Check if it's a single expression
		matches := re.FindAllString(trimmed, -1)
		if len(matches) == 1 && matches[0] == trimmed {
			expr := strings.TrimSpace(trimmed[2 : len(trimmed)-2])
			return evaluateExpression(expr, arg)
		}
	}

	return resolvedStr
}

func evaluateExpression(expr string, arg NodeArg) interface{} {
	// 1. $vars.key
	if strings.HasPrefix(expr, "$vars.") {
		key := strings.TrimPrefix(expr, "$vars.")
		if val, ok := arg.Scope.Get(key); ok {
			return val
		}
		return nil
	}

	// 2. $json.key (Input)
	if strings.HasPrefix(expr, "$json.") {
		key := strings.TrimPrefix(expr, "$json.")
		if inputMap, ok := arg.Input.(map[string]interface{}); ok {
			return inputMap[key]
		}
		return nil
	}

	// 3. $node["Name"].json.key
	if strings.HasPrefix(expr, "$node[") {
		// Parse Node Name: $node["My Node"]
		// Find closing bracket
		closeBracket := strings.Index(expr, "]")
		if closeBracket > 7 {
			// Extract name: "My Node" or 'My Node'
			rawName := expr[6:closeBracket]
			// Trim quotes
			nodeName := strings.Trim(rawName, "\"'")

			// Remainder: .json.key
			remainder := expr[closeBracket+1:]
			if strings.HasPrefix(remainder, ".json.") || strings.HasPrefix(remainder, ".output.") {
				// Normalized key path
				keyPath := ""
				if strings.HasPrefix(remainder, ".json.") {
					keyPath = strings.TrimPrefix(remainder, ".json.")
				} else {
					keyPath = strings.TrimPrefix(remainder, ".output.")
				}

				// Find Node ID by Name
				var nodeID string
				for id, name := range arg.NodeNames {
					if name == nodeName {
						nodeID = id
						break
					}
				}

				if nodeID != "" {
					if result, ok := arg.NodeResults[nodeID]; ok {
						if outputMap, ok := result.Output.(map[string]interface{}); ok {
							return outputMap[keyPath]
						}
					}
				}
			}
		}
	}

	return expr // Fallback to raw string
}

func ResolveConfig(rawConfig map[string]interface{}, arg NodeArg) map[string]interface{} {
	resolved := make(map[string]interface{})
	for k, v := range rawConfig {
		resolved[k] = resolveValue(v, arg)
	}
	return resolved
}

// ── WireBuiltinExecutors ──────────────────────────────────

// WireBuiltinExecutors 根據節點 Type 自動綁定 Executor
// bridge 可為 nil：flow/log/sleep 節點不需要 bridge
// logger 可為 nil：默認為 fmt.Printf
func WireBuiltinExecutors(wf *Workflow, bridge *PythonBridge, logger func(string)) {
	for _, node := range wf.Nodes {
		if node.Executor != nil {
			continue
		}
		node.Executor = createBuiltinExecutor(node, bridge, logger)
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

	// ── Platform/Vision 節點 → 透過 Bridge 呼叫 Python ──
	if isPlatformNode(nodeType) {
		return createBridgeExecutor(nodeType, rawConfig, bridge, logf)
	}

	// ── Flow Control / 純 Go 節點 ──
	switch nodeType {

	case "log":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			config := ResolveConfig(rawConfig, arg)
			msg := getConfigStr(config, "message", "")
			level := getConfigStr(config, "type", "info") // "type" matches NodeRegistry
			logf("[Workflow][%s] %s\n", level, msg)
			return NodeOutput{Signal: "success", Output: map[string]interface{}{
				"message": msg,
				"level":   level,
			}}
		}

	case "sleep":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			config := ResolveConfig(rawConfig, arg)
			// support "seconds" (float) or "duration_ms" (int)
			ms := 0
			if val, ok := config["seconds"]; ok {
				// float seconds
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
				return NodeOutput{Signal: "success", Output: arg.Input}
			case <-ctx.Done():
				logf("[Workflow] Sleep cancelled\n")
				return NodeOutput{Signal: "cancelled", Output: nil}
			}
		}

	case "if_condition":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			config := ResolveConfig(rawConfig, arg)
			// Old behavior: just check 'expression'
			expression := getConfigStr(config, "expression", "")

			// New behavior: check operator
			operator := getConfigStr(config, "operator", "")
			value1Raw := config["value1"]
			value2Raw := config["value2"]

			// Fallback to old expression if set (for backward compat)
			if operator == "" && expression != "" {
				result := "true"
				if expression == "" || expression == "false" || expression == "0" {
					result = "false"
				}
				logf("[Workflow] If expression=%s → %s\n", expression, result)
				return NodeOutput{Signal: result, Output: arg.Input}
			}

			// Operator Logic
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
			// Number comparisons (simplified: convert to float)
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
			// Boolean
			case "boolean:isTrue":
				result = (v1Str == "true")
			case "boolean:isFalse":
				result = (v1Str == "false")
			default:
				// Default true if unknown operator, or maybe false?
				// Treating "exists" as true for now if value is not nil
				if strings.HasSuffix(operator, ":exists") {
					result = (value1Raw != nil && v1Str != "")
				}
			}

			signal := "false"
			if result {
				signal = "true"
			}
			logf("[Workflow] If %s (%s) %s (%s) → %s\n", v1Str, value1Raw, operator, value2Raw, signal)
			return NodeOutput{Signal: signal, Output: arg.Input}
		}

	case "switch":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			config := ResolveConfig(rawConfig, arg)
			valueRaw := config["value"]
			mode := getConfigStr(config, "mode", "string") // "string", "number"
			valueStr := fmt.Sprintf("%v", valueRaw)

			// Cases: assume "cases" is map or list?
			// NodeRegistry probably defines it as a list of rules?
			// For simplicity, let's assume config stores "case_0", "case_1", ... or "rules" array.
			// Standard Switch usually matches value against cases.
			// Let's look for "rules" array if it exists (complex object), otherwise fallback to manual keys.
			// Implementation: Return signal "0", "1", "2" for index, or "default".

			// Check "cases" from config (parsed as slice of interface{})
			casesRaw := config["cases"]
			var cases []interface{}

			if slice, ok := casesRaw.([]interface{}); ok {
				cases = slice
			} else if str, ok := casesRaw.(string); ok {
				// Try to parse JSON array string
				if err := json.Unmarshal([]byte(str), &cases); err != nil {
					logf("[Workflow] Switch failed to parse cases JSON: %v\n", err)
				}
			}

			if len(cases) > 0 {
				for i, caseValRaw := range cases {
					caseValStr := fmt.Sprintf("%v", caseValRaw)
					matched := false
					if mode == "number" {
						n1, err1 := strconv.ParseFloat(valueStr, 64)
						n2, err2 := strconv.ParseFloat(caseValStr, 64)
						if err1 == nil && err2 == nil && n1 == n2 {
							matched = true
						}
					} else {
						if valueStr == caseValStr {
							matched = true
						}
					}

					if matched {
						logf("[Workflow] Switch matched case %d: %s == %s\n", i, valueStr, caseValStr)
						return NodeOutput{Signal: fmt.Sprintf("%d", i), Output: arg.Input}
					}
				}
			}

			logf("[Workflow] Switch no match for %s, going default\n", valueStr)
			return NodeOutput{Signal: "default", Output: arg.Input}
		}

	case "set_variable":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			// Initialize new Input map (Data Stream)
			newInput := make(map[string]interface{})

			// Copy existing input if it's a map (Merge behavior)
			if inputMap, ok := arg.Input.(map[string]interface{}); ok {
				for k, v := range inputMap {
					newInput[k] = v
				}
			}

			// Config input is 'json_input' string or raw object
			config := ResolveConfig(rawConfig, arg)

			// Helper to set variable in scope AND stream
			setVar := func(k string, v interface{}) {
				// 1. Set to Stream (Input for next node)
				newInput[k] = v
				// 2. Set to Current Scope (for $vars access)
				arg.Scope.Set(k, v)
				logf("[Workflow] Set var %s = %v\n", k, v)
			}

			// 1. Try to parse 'json_input'
			if jsonStr, ok := config["json_input"].(string); ok {
				var parsedVars map[string]interface{}
				if err := json.Unmarshal([]byte(jsonStr), &parsedVars); err == nil {
					for k, v := range parsedVars {
						setVar(k, v)
					}
				} else {
					logf("[Workflow] Failed to parse json_input: %v\n", err)
				}
			}

			// 2. Direct keys from config
			for k, v := range config {
				if k == "json_input" {
					continue
				}
				setVar(k, v)
			}

			return NodeOutput{Signal: "success", Output: newInput}
		}

	case "loop":
		// Iterator Implementation with Scope
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			// Resolve items
			config := ResolveConfig(rawConfig, arg)
			itemsRaw := config["items"]

			var items []interface{}
			if slice, ok := itemsRaw.([]interface{}); ok {
				items = slice
			}

			// If "items" is string (parsed from JSON in expression), unmarshal it
			if str, ok := itemsRaw.(string); ok {
				var parsed []interface{}
				if err := json.Unmarshal([]byte(str), &parsed); err == nil {
					items = parsed
				}
			}

			if len(items) == 0 {
				logf("[Workflow] Loop: No items to iterate\n")
				return NodeOutput{Signal: "done", Output: arg.Input}
			}

			// Check if we are already in a loop scope (re-entry)
			// We look for a unique state key in the CURRENT scope.
			// The state key identifies THIS loop node's state.
			stateKey := fmt.Sprintf("__loop_state_%s__", node.ID)
			stateVal, inLoopScope := arg.Scope.Variables[stateKey]

			var idx int
			if inLoopScope {
				// We are inside the loop scope, increment index
				idx = stateVal.(int) + 1
				logf("[Workflow] Loop continue, index: %d\n", idx)
			} else {
				// First entry, or re-entry from parent
				idx = 0
				logf("[Workflow] Loop start, index: 0\n")
			}

			// Check Bounds
			if idx >= len(items) {
				logf("[Workflow] Loop done (%d items)\n", len(items))
				if inLoopScope {
					// We are inside loop scope, but finished -> Pop
					return NodeOutput{Signal: "done", Output: arg.Input, ScopeAction: "pop"}
				} else {
					// Empty loop or finished immediately?
					return NodeOutput{Signal: "done", Output: arg.Input}
				}
			}

			// Process Item
			currentItem := items[idx]
			logf("[Workflow] Loop processing %d/%d: %v\n", idx+1, len(items), currentItem)

			// Prepare Scope Data
			// We always update the scope variables.
			// If pushing (idx==0), we provide initial data.
			// If staying (idx>0), we update existing via side-effect on Scope?
			// Wait, if we return ScopeAction="push", FlowEngine creates NEW scope.
			// If we return ScopeAction="", FlowEngine keeps current scope.

			// Output Stream (Context for next nodes)
			newInput := make(map[string]interface{})
			if inputMap, ok := arg.Input.(map[string]interface{}); ok {
				for k, v := range inputMap {
					newInput[k] = v
				}
			}
			newInput["item"] = currentItem
			newInput["index"] = idx

			if !inLoopScope {
				// Create new scope
				scopeData := map[string]interface{}{
					stateKey: idx,
					"index":  idx,
					"item":   currentItem,
				}
				return NodeOutput{Signal: "body", Output: newInput, ScopeAction: "push", ScopeData: scopeData}
			} else {
				// Update existing scope
				arg.Scope.Set(stateKey, idx)
				arg.Scope.Set("index", idx)
				arg.Scope.Set("item", currentItem)
				return NodeOutput{Signal: "body", Output: newInput}
			}
		}

	case "convert":
		// Explicit Convert node type — pass-through data transformation
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			logf("[Workflow] Convert node: %s\n", node.Name)
			return NodeOutput{Signal: "success", Output: arg.Input}
		}

	case "sub_workflow":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			config := ResolveConfig(rawConfig, arg)
			wfId := getConfigStr(config, "workflow_id", "")
			logf("[Workflow] SubWorkflow id=%s (stub)\n", wfId)
			return NodeOutput{Signal: "success", Output: arg.Input}
		}

	default:
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			logf("[Workflow] Unknown node type: %s, passing through\n", nodeType)
			return NodeOutput{Signal: "success", Output: arg.Input}
		}
	}
}

// createBridgeExecutor 建立透過 PythonBridge 執行的 Executor
func createBridgeExecutor(nodeType string, rawConfig map[string]interface{}, bridge *PythonBridge, logf func(string, ...interface{})) func(context.Context, NodeArg) NodeOutput {
	return func(ctx context.Context, arg NodeArg) NodeOutput {
		if bridge == nil {
			logf("[Workflow] No bridge available, stubbing %s\n", nodeType)
			return NodeOutput{Signal: "success", Output: map[string]interface{}{
				"action": nodeType,
				"stub":   true,
			}}
		}

		// Check context before calling bridge
		if ctx.Err() != nil {
			return NodeOutput{Signal: "cancelled", Output: nil}
		}

		// Resolve config dynamically!
		config := ResolveConfig(rawConfig, arg)
		params := make(map[string]interface{})
		for k, v := range config {
			params[k] = v
		}

		logf("[Workflow] Bridge call: %s params=%v\n", nodeType, params)

		resp, err := bridge.Call(nodeType, params)
		if err != nil {
			logf("[Workflow] Bridge error: %v\n", err)
			return NodeOutput{Signal: "error", Output: map[string]interface{}{
				"action": nodeType,
				"error":  err.Error(),
			}}
		}

		if resp.Error != "" {
			logf("[Workflow] Bridge action error: %s\n", resp.Error)
			return NodeOutput{Signal: "error", Output: map[string]interface{}{
				"action": nodeType,
				"error":  resp.Error,
			}}
		}

		// Convert output to generic interface
		var output interface{}
		if resp.Output != nil {
			output = resp.Output
		}

		return NodeOutput{Signal: resp.Signal, Output: output}
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
	executionPath := []ExecutionStep{}
	currentData := input
	var currentSignal string
	currentNodeId := e.findStartNode()

	// Pre-calculate Node Names for resolution
	nodeNames := make(map[string]string)
	for id, node := range e.Workflow.Nodes {
		nodeNames[id] = node.Name
	}

	if currentNodeId == "" {
		return &ExecutionResult{
			Output:        nil,
			Signal:        "",
			ExecutionPath: executionPath,
		}, fmt.Errorf("no start node found: workflow has no nodes or all nodes have incoming edges")
	}

	for currentNodeId != "" {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		node, ok := e.Workflow.Nodes[currentNodeId]
		if !ok {
			return nil, fmt.Errorf("node %s not found", currentNodeId)
		}

		var nodeOutput NodeOutput

		// Prepare NodeArg with Context
		arg := NodeArg{
			Input:       currentData,
			Scope:       e.CurrentScope,
			NodeResults: e.NodeResults,
			NodeNames:   nodeNames,
		}

		if node.Type == NodeSubWorkflow && node.SubWorkflow != nil {
			subEngine := NewFlowEngine(node.SubWorkflow)
			// Pass parent context? For now separate scope.
			subResult, err := subEngine.Execute(ctx, currentData)
			if err != nil {
				return nil, fmt.Errorf("sub-workflow %s failed: %v", node.ID, err)
			}
			// Propagate sub-workflow's terminal signal (not hardcoded "success")
			nodeOutput = NodeOutput{Signal: subResult.Signal, Output: subResult.Output}
		} else if node.Executor != nil {
			nodeOutput = node.Executor(ctx, arg)
		} else {
			return nil, fmt.Errorf("node %s (%s) has no executor", node.Name, currentNodeId)
		}

		// Handle Scope Actions
		if nodeOutput.ScopeAction == "push" {
			newScope := &Scope{
				Variables: make(map[string]interface{}),
				Parent:    e.CurrentScope,
			}
			// Init variables
			for k, v := range nodeOutput.ScopeData {
				newScope.Variables[k] = v
			}
			e.CurrentScope = newScope
		} else if nodeOutput.ScopeAction == "pop" {
			if e.CurrentScope.Parent != nil {
				e.CurrentScope = e.CurrentScope.Parent
			}
		}

		// Record result
		e.NodeResults[node.ID] = nodeOutput

		step := ExecutionStep{
			NodeID:   node.ID,
			NodeName: node.Name,
			NodeType: string(node.Type),
			Signal:   nodeOutput.Signal,
			Input:    currentData,
			Output:   nodeOutput.Output,
		}

		executionPath = append(executionPath, step)

		if e.OnStep != nil {
			e.OnStep(step)
		}

		currentSignal = nodeOutput.Signal
		currentData = nodeOutput.Output
		currentNodeId = e.findNextNode(currentNodeId, nodeOutput.Signal)
	}

	return &ExecutionResult{
		Output:        currentData,
		Signal:        currentSignal,
		ExecutionPath: executionPath,
	}, nil
}

func (e *FlowEngine) findNextNode(currentNodeId, signal string) string {
	for _, edge := range e.Workflow.Edges {
		if edge.FromNodeID == currentNodeId && edge.Signal == signal {
			return edge.ToNodeID
		}
	}
	return ""
}
