package main

import (
	"context"
	"fmt"
	"log"
	"script-platform/server/db"
	"script-platform/server/workflow"
)

func main() {
	if err := db.Init("workflows.db"); err != nil {
		log.Fatal("DB Init failed:", err)
	}

	wf, err := workflow.GetWorkflow("test_condition_suite")
	if err != nil {
		log.Fatal("GetWorkflow failed:", err)
	}

	engine := workflow.NewFlowEngine(wf)

	failedTests := 0

	logger := func(msg string) {
		// Only print logs to see the test results
		fmt.Println("LOG:", msg)
	}

	engine.OnStep = func(step workflow.ExecutionStep) {
		// We can intercept step output
		if step.NodeType == "log" {
			if step.Output["success"] != nil && len(step.Output["success"]) > 0 {
				msgObj := step.Output["success"][0].JSON["message"]
				if msg, ok := msgObj.(string); ok {
					if msg[:5] == "ERROR" {
						failedTests++
					}
				}
			}
		}
	}

	workflow.WireBuiltinExecutors(wf, nil, logger)

	_, err = engine.Execute(context.Background(), nil)
	if err != nil {
		log.Fatal("Execution failed:", err)
	}

	fmt.Printf("\n=== Test Suite Results ===\n")
	if failedTests == 0 {
		fmt.Printf("✅ All Conditions Evaluated Correctly!\n")
	} else {
		fmt.Printf("❌ %d tests FAILED.\n", failedTests)
	}
}
