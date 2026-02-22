package workflow

import (
	"context"
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
	ID          string          `json:"id"`
	ProjectID   string          `json:"projectId"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Platform    string          `json:"platform"`
	Nodes       []*WorkflowNode `json:"nodes"`
	Edges       []WorkflowEdge  `json:"edges"`
	StartNodeID string          `json:"startNodeId"`
}

// FlowEngine 執行引擎
type FlowEngine struct {
	Workflow      *Workflow
	GlobalContext map[string]interface{}
	NodeResults   map[string]NodeOutput
	NodeMap       map[string]*WorkflowNode // Optimized lookup
	OnStep        func(step ExecutionStep)
}

// NewFlowEngine 建立執行引擎
func NewFlowEngine(wf *Workflow) *FlowEngine {
	// Build node map
	nodeMap := make(map[string]*WorkflowNode)
	for _, node := range wf.Nodes {
		nodeMap[node.ID] = node
	}

	return &FlowEngine{
		Workflow:      wf,
		GlobalContext: make(map[string]interface{}),
		NodeResults:   make(map[string]NodeOutput),
		NodeMap:       nodeMap,
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

	// Iterate over slice, order is stable
	for _, node := range e.Workflow.Nodes {
		if !hasIncoming[node.ID] {
			if bestID == "" || node.Y < bestY {
				bestID = node.ID
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

		nodeType := string(node.Type)
		// Check Registry
		if factory, ok := executorRegistry[nodeType]; ok {
			node.Executor = factory(node, bridge, logger).Execute
			continue
		}

		// Fallback to legacy or platform
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
		return createBridgeExecutor(node, rawConfig, bridge, logf)
	}

	// Default fallback
	return func(ctx context.Context, arg NodeArg) NodeOutput {
		return singleOutput("success", arg.Input)
	}
}

// createBridgeExecutor 建立透過 PythonBridge 執行的 Executor
func createBridgeExecutor(node *WorkflowNode, rawConfig map[string]interface{}, bridge *PythonBridge, logf func(string, ...interface{})) func(context.Context, NodeArg) NodeOutput {
	nodeType := string(node.Type)
	nodeName := node.Name
	if nodeName == "" {
		nodeName = nodeType
	}

	return func(ctx context.Context, arg NodeArg) NodeOutput {
		if bridge == nil {
			logf("[Workflow] No bridge, stubbing [%s]", nodeName)
			return singleOutput("success", ExecutionData{{JSON: map[string]interface{}{"stub": true}}})
		}

		var resultItems ExecutionData

		// Platform/Action nodes must execute at least once even with empty input.
		// If no input items, create one empty item to ensure the bridge call fires.
		inputList := arg.Input
		if len(inputList) == 0 {
			inputList = ExecutionData{{JSON: make(map[string]interface{})}}
		}
		for _, item := range inputList {
			if ctx.Err() != nil {
				break
			}

			config := ResolveConfig(rawConfig, arg, &item)
			params := make(map[string]interface{})
			for k, v := range config {
				params[k] = v
			}

			// 建立更有意義的 Log
			paramInfo := ""
			if nodeType == "click_image" || nodeType == "find_image" || nodeType == "wait_image" || nodeType == "wait_click_image" {
				if img, ok := params["image"].(string); ok {
					paramInfo = fmt.Sprintf(" image=%s", img)
				}
			} else if nodeType == "type_text" {
				if txt, ok := params["text"].(string); ok {
					paramInfo = fmt.Sprintf(" text=%s", txt)
				}
			} else if nodeType == "click" {
				paramInfo = fmt.Sprintf(" x=%v, y=%v", params["x"], params["y"])
			} else if nodeType == "key_event" {
				paramInfo = fmt.Sprintf(" key=%v", params["key_code"])
			}

			logf("[Workflow] Executing [%s] (%s)%s", nodeName, nodeType, paramInfo)

			resp, err := bridge.Call(nodeType, params)

			newItem := ExecutionItem{
				JSON: make(map[string]interface{}),
			}

			if err != nil {
				newItem.JSON["error"] = err.Error()
				logf("[Workflow] [%s] Error: %v", nodeName, err)
			} else if resp.Error != "" {
				newItem.JSON["error"] = resp.Error
				logf("[Workflow] [%s] Bridge Error: %v", nodeName, resp.Error)
			} else {
				if resp.Output != nil {
					// Merge output into item? Or replace?
					// n8n Actions usually return new data (e.g. click result).
					// Sometimes they append.
					// Let's assume Output is the new JSON content.
					if outMap, ok := resp.Output.(map[string]interface{}); ok {
						newItem.JSON = outMap
						// Log result info if meaningful
						if success, ok := outMap["success"].(bool); ok {
							sim := ""
							if s, ok := outMap["similarity"].(float64); ok {
								sim = fmt.Sprintf(" (similarity: %.2f)", s)
							}
							logf("[Workflow] [%s] Returned: %v%s", nodeName, success, sim)
						} else if val, ok := outMap["text"].(string); ok {
							logf("[Workflow] [%s] Result text: %s", nodeName, val)
						}
					} else {
						newItem.JSON["result"] = resp.Output
						logf("[Workflow] [%s] Result: %v", nodeName, resp.Output)
					}
				} else {
					logf("[Workflow] [%s] Done", nodeName)
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
	for _, node := range e.Workflow.Nodes {
		nodeNames[node.ID] = node.Name
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

		node, ok := e.NodeMap[currentNodeId]
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

		// Emit 'running' status before execution
		if e.OnStep != nil {
			e.OnStep(ExecutionStep{
				NodeID:    node.ID,
				NodeName:  node.Name,
				NodeType:  string(node.Type),
				Status:    "running",
				StartTime: startTime,
			})
		}

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
