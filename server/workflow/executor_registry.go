package workflow

import (
	"context"
)

// NodeExecutor interface defines the contract for executing a node
type NodeExecutor interface {
	Execute(ctx context.Context, arg NodeArg) NodeOutput
}

// NodeExecutorFactory is a function that creates a NodeExecutor
type NodeExecutorFactory func(node *WorkflowNode, bridge *PythonBridge, logger func(string)) NodeExecutor

// Registry to hold executor factories
var executorRegistry = make(map[string]NodeExecutorFactory)

// RegisterExecutor registers a factory for a given node type
func RegisterExecutor(nodeType string, factory NodeExecutorFactory) {
	executorRegistry[nodeType] = factory
}

// GetExecutorFactory retrieves the factory for a given node type
func GetExecutorFactory(nodeType string) NodeExecutorFactory {
	return executorRegistry[nodeType]
}

// FunctionalExecutor wrapper for simple functions to implement NodeExecutor interface
type FunctionalExecutor struct {
	Fn func(ctx context.Context, arg NodeArg) NodeOutput
}

func (f *FunctionalExecutor) Execute(ctx context.Context, arg NodeArg) NodeOutput {
	return f.Fn(ctx, arg)
}
