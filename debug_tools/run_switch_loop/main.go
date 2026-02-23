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

	wf, err := workflow.GetWorkflow("test_switch_loop_suite")
	if err != nil {
		log.Fatal("GetWorkflow failed:", err)
	}

	engine := workflow.NewFlowEngine(wf)

	failedTests := 0
	loopArrayBodyCount := 0
	loopCountBodyCount := 0

	logger := func(msg string) {
		fmt.Println("LOG:", msg)
	}

	engine.OnStep = func(step workflow.ExecutionStep) {
		if step.NodeType == "log" && step.Status == "success" {
			name := step.NodeName
			if len(name) >= 6 && name[:6] == "Failed" {
				failedTests++
			} else if name == "Loop Array Body" {
				loopArrayBodyCount++
			} else if name == "Loop Count Body" {
				loopCountBodyCount++
			}
		}
	}

	workflow.WireBuiltinExecutors(wf, nil, logger)

	_, err = engine.Execute(context.Background(), nil)
	if err != nil {
		log.Fatal("Execution failed:", err)
	}

	if loopArrayBodyCount != 3 {
		fmt.Printf("❌ Loop Array failed. Expected 3 body executions, got %d\n", loopArrayBodyCount)
		failedTests++
	} else {
		fmt.Println("✅ Loop Array body executed exactly 3 times")
	}

	if loopCountBodyCount != 3 {
		fmt.Printf("❌ Loop Count failed. Expected 3 body executions, got %d\n", loopCountBodyCount)
		failedTests++
	} else {
		fmt.Println("✅ Loop Count body executed exactly 3 times")
	}

	fmt.Printf("\n=== Test Suite Results ===\n")
	if failedTests == 0 {
		fmt.Printf("✅ All Switch and Loop Nodes Evaluated Correctly!\n")
	} else {
		fmt.Printf("❌ %d tests FAILED.\n", failedTests)
	}
}
