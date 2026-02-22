package workflow

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	_ "github.com/glebarez/go-sqlite"
)

func setupTestDB(t *testing.T) (*sql.DB, string) {
	tempDir, err := os.MkdirTemp("", "workflow_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tempDir, "test.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("Failed to open db: %v", err)
	}

	// Init schema
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS executions (
			id TEXT PRIMARY KEY,
			workflow_id TEXT NOT NULL,
			status TEXT NOT NULL,
			start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			end_time TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS execution_steps (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			execution_id TEXT NOT NULL,
			node_id TEXT NOT NULL,
			node_name TEXT,
			node_type TEXT,
			status TEXT,
			start_time TIMESTAMP,
			end_time TIMESTAMP,
			duration INTEGER,
			output TEXT
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create schema: %v", err)
	}

	return db, tempDir
}

func TestExecutionStore(t *testing.T) {
	db, tempDir := setupTestDB(t)
	defer db.Close()
	defer os.RemoveAll(tempDir)

	store := NewSQLiteExecutionStore(db)
	wfID := "wf_123"

	// 1. Create Execution
	runID, err := store.CreateExecution(wfID)
	if err != nil {
		t.Fatalf("CreateExecution failed: %v", err)
	}
	if runID == "" {
		t.Error("Expected runID, got empty")
	}

	// 2. Record Steps
	step1 := ExecutionStep{
		NodeID:    "node_1",
		NodeName:  "Start Node",
		NodeType:  "start",
		Status:    "success",
		StartTime: time.Now(),
		EndTime:   time.Now().Add(100 * time.Millisecond),
		Duration:  100,
		Output: map[string]ExecutionData{
			"success": {{JSON: map[string]interface{}{"foo": "bar"}}},
		},
	}
	if err := store.RecordStep(runID, step1); err != nil {
		t.Errorf("RecordStep 1 failed: %v", err)
	}

	step2 := ExecutionStep{
		NodeID:    "node_2",
		NodeName:  "Process Node",
		NodeType:  "process",
		Status:    "error",
		StartTime: time.Now().Add(200 * time.Millisecond),
		EndTime:   time.Now().Add(300 * time.Millisecond),
		Duration:  100,
		Output: map[string]ExecutionData{
			"error": {{JSON: map[string]interface{}{"msg": "failed"}}},
		},
	}
	if err := store.RecordStep(runID, step2); err != nil {
		t.Errorf("RecordStep 2 failed: %v", err)
	}

	// 3. Update Status
	if err := store.UpdateExecutionStatus(runID, "error"); err != nil {
		t.Errorf("UpdateExecutionStatus failed: %v", err)
	}

	// 4. Get Execution & Verify
	result, err := store.GetExecution(runID)
	if err != nil {
		t.Fatalf("GetExecution failed: %v", err)
	}

	if len(result.ExecutionPath) != 2 {
		t.Errorf("Expected 2 steps, got %d", len(result.ExecutionPath))
	}

	// Check serialization
	s1 := result.ExecutionPath[0]
	if s1.NodeID != "node_1" {
		t.Errorf("Step 1 ID mismatch: %s", s1.NodeID)
	}
	if val, ok := s1.Output["success"][0].JSON["foo"]; !ok || val != "bar" {
		t.Errorf("Step 1 output mismatch: %v", s1.Output)
	}

	s2 := result.ExecutionPath[1]
	if s2.Status != "error" {
		t.Errorf("Step 2 status mismatch: %s", s2.Status)
	}
}
