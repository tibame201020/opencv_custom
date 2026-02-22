package workflow

import (
	"database/sql"
	"os"
	"path/filepath"
	"script-platform/server/db"
	"testing"

	_ "github.com/glebarez/go-sqlite"
)

func setupWorkflowDB(t *testing.T) (*sql.DB, string) {
	tempDir, err := os.MkdirTemp("", "workflow_db_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tempDir, "test.db")

	// Initialize global DB for workflow functions
	if err := db.Init(dbPath); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}

	return db.DB, tempDir
}

func TestWorkflowOrderPersistence(t *testing.T) {
	_, tempDir := setupWorkflowDB(t)
	defer db.Close()
	defer os.RemoveAll(tempDir)

	// Create a workflow with nodes in specific order
	wf := &Workflow{
		ID:          "order_test",
		Name:        "Order Test",
		ProjectID:   "p1",
		Description: "Testing node order",
		Nodes: []*WorkflowNode{
			{ID: "node_A", Name: "A", Type: "log", X: 100, Y: 100},
			{ID: "node_B", Name: "B", Type: "log", X: 200, Y: 100},
			{ID: "node_C", Name: "C", Type: "log", X: 300, Y: 100},
		},
		Edges: []WorkflowEdge{},
	}

	// 1. Save
	if err := SaveWorkflow(wf); err != nil {
		t.Fatalf("SaveWorkflow failed: %v", err)
	}

	// 2. Load
	loadedWf, err := GetWorkflow("order_test")
	if err != nil {
		t.Fatalf("GetWorkflow failed: %v", err)
	}

	// 3. Verify Order
	if len(loadedWf.Nodes) != 3 {
		t.Fatalf("Expected 3 nodes, got %d", len(loadedWf.Nodes))
	}

	if loadedWf.Nodes[0].ID != "node_A" {
		t.Errorf("Node 0 mismatch: expected node_A, got %s", loadedWf.Nodes[0].ID)
	}
	if loadedWf.Nodes[1].ID != "node_B" {
		t.Errorf("Node 1 mismatch: expected node_B, got %s", loadedWf.Nodes[1].ID)
	}
	if loadedWf.Nodes[2].ID != "node_C" {
		t.Errorf("Node 2 mismatch: expected node_C, got %s", loadedWf.Nodes[2].ID)
	}

	// 4. Update with different order (Simulate "Bring to Front" which moves node to end of array)
	// Move A to end: B, C, A
	newOrder := []*WorkflowNode{
		loadedWf.Nodes[1],
		loadedWf.Nodes[2],
		loadedWf.Nodes[0],
	}
	wf.Nodes = newOrder

	if err := SaveWorkflow(wf); err != nil {
		t.Fatalf("SaveWorkflow (update) failed: %v", err)
	}

	reloadedWf, err := GetWorkflow("order_test")
	if err != nil {
		t.Fatalf("GetWorkflow (reloaded) failed: %v", err)
	}

	if reloadedWf.Nodes[0].ID != "node_B" {
		t.Errorf("Reloaded Node 0 mismatch: expected node_B, got %s", reloadedWf.Nodes[0].ID)
	}
	if reloadedWf.Nodes[1].ID != "node_C" {
		t.Errorf("Reloaded Node 1 mismatch: expected node_C, got %s", reloadedWf.Nodes[1].ID)
	}
	if reloadedWf.Nodes[2].ID != "node_A" {
		t.Errorf("Reloaded Node 2 mismatch: expected node_A, got %s", reloadedWf.Nodes[2].ID)
	}
}
