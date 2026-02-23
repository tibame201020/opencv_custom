package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"script-platform/server/db"
	"script-platform/server/workflow"
)

func main() {
	if err := db.Init("workflows.db"); err != nil {
		log.Fatal("DB Init failed:", err)
	}

	wf, err := workflow.GetWorkflow("sd_loop")
	if err != nil {
		log.Fatal("GetWorkflow failed:", err)
	}

	for _, n := range wf.Nodes {
		configBytes, _ := json.Marshal(n.Config)
		fmt.Printf("Node %s (%s) Config: %s\n", n.Name, n.Type, string(configBytes))
	}

	engine := workflow.NewFlowEngine(wf)
	logger := func(msg string) {
		fmt.Println("LOG:", msg)
	}

	engine.OnStep = func(step workflow.ExecutionStep) {
		outBytes, _ := json.Marshal(step.Output)
		fmt.Printf("STEP %s output: %s\n", step.NodeName, string(outBytes))
	}

	workflow.WireBuiltinExecutors(wf, nil, logger)

	res, err := engine.Execute(context.Background(), nil)
	if err != nil {
		log.Fatal("Execution failed:", err)
	}

	outJson, _ := json.MarshalIndent(res.Output, "", "  ")
	fmt.Printf("\nFinal Output:\n%s\n", string(outJson))
}
