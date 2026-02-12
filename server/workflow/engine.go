package workflow

import (
	"context"
	"fmt"
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

// NodeOutput 節點執行結果
type NodeOutput struct {
	Signal string      `json:"signal"`
	Output interface{} `json:"output"`
}

// NodeArg 節點輸入參數
type NodeArg struct {
	Input interface{} `json:"input"`
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

// ExecutionStep 每個節點的執行記錄
type ExecutionStep struct {
	NodeID   string      `json:"nodeId"`
	NodeName string      `json:"nodeName"`
	NodeType string      `json:"nodeType"`
	Signal   string      `json:"signal"`
	Output   interface{} `json:"output,omitempty"`
}

// ExecutionResult 執行結果
type ExecutionResult struct {
	Output        interface{}     `json:"output"`
	ExecutionPath []ExecutionStep `json:"executionPath"`
}

// FlowEngine 執行引擎
type FlowEngine struct {
	Workflow *Workflow
}

// NewFlowEngine 建立執行引擎
func NewFlowEngine(wf *Workflow) *FlowEngine {
	return &FlowEngine{Workflow: wf}
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
	config := node.Config

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
		return createBridgeExecutor(nodeType, config, bridge, logf)
	}

	// ── Flow Control / 純 Go 節點 ──
	switch nodeType {

	case "log":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			msg := getConfigStr(config, "message", "")
			level := getConfigStr(config, "level", "info")
			logf("[Workflow][%s] %s\n", level, msg)
			return NodeOutput{Signal: "success", Output: map[string]interface{}{
				"message": msg,
				"level":   level,
			}}
		}

	case "sleep":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			ms := getConfigInt(config, "duration_ms", 1000)
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
			expression := getConfigStr(config, "expression", "true")
			result := "true"
			if expression == "" || expression == "false" || expression == "0" {
				result = "false"
			}
			logf("[Workflow] If condition=%s → %s\n", expression, result)
			return NodeOutput{Signal: result, Output: arg.Input}
		}

	case "loop":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
			count := getConfigInt(config, "count", 1)
			logf("[Workflow] Loop count=%d\n", count)
			return NodeOutput{Signal: "success", Output: map[string]interface{}{
				"action": "loop", "count": count, "iteration": 0,
			}}
		}

	case "sub_workflow":
		return func(ctx context.Context, arg NodeArg) NodeOutput {
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
func createBridgeExecutor(nodeType string, config map[string]interface{}, bridge *PythonBridge, logf func(string, ...interface{})) func(context.Context, NodeArg) NodeOutput {
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

		// Build params from node config
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
		if s, ok := v.(string); ok {
			return s
		}
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
	currentNodeId := e.findStartNode()

	if currentNodeId == "" {
		return &ExecutionResult{
			Output:        nil,
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

		if node.Type == NodeSubWorkflow && node.SubWorkflow != nil {
			subEngine := NewFlowEngine(node.SubWorkflow)
			subResult, err := subEngine.Execute(ctx, currentData)
			if err != nil {
				return nil, fmt.Errorf("sub-workflow %s failed: %v", node.ID, err)
			}
			nodeOutput = NodeOutput{Signal: "success", Output: subResult.Output}
		} else if node.Executor != nil {
			nodeOutput = node.Executor(ctx, NodeArg{Input: currentData})
		} else {
			return nil, fmt.Errorf("node %s (%s) has no executor", node.Name, currentNodeId)
		}

		executionPath = append(executionPath, ExecutionStep{
			NodeID:   node.ID,
			NodeName: node.Name,
			NodeType: string(node.Type),
			Signal:   nodeOutput.Signal,
			Output:   nodeOutput.Output,
		})

		currentData = nodeOutput.Output
		currentNodeId = e.findNextNode(currentNodeId, nodeOutput.Signal)
	}

	return &ExecutionResult{
		Output:        currentData,
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
