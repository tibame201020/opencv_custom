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

func TestComplexDataPersistence(t *testing.T) {
	db, tempDir := setupTestDB(t)
	defer db.Close()
	defer os.RemoveAll(tempDir)

	store := NewSQLiteExecutionStore(db)
	runID, _ := store.CreateExecution("complex_wf")

	// Complex nested JSON
	complexOutput := map[string]ExecutionData{
		"data": {
			{
				JSON: map[string]interface{}{
					"string": "hello world",
					"int":    42,
					"float":  3.14159,
					"bool":   true,
					"null":   nil,
					"nested": map[string]interface{}{
						"array": []interface{}{1, "two", 3.0},
						"deep":  map[string]interface{}{"key": "value"},
					},
					"special_chars": "你好!@#$%^&*()_+",
				},
			},
		},
	}

	step := ExecutionStep{
		NodeID:    "complex_node",
		Status:    "success",
		StartTime: time.Now(),
		Output:    complexOutput,
	}

	if err := store.RecordStep(runID, step); err != nil {
		t.Fatalf("Failed to record complex step: %v", err)
	}

	// Verify
	result, err := store.GetExecution(runID)
	if err != nil {
		t.Fatalf("Failed to get execution: %v", err)
	}

	loadedJSON := result.ExecutionPath[0].Output["data"][0].JSON

	// Deep check
	if loadedJSON["string"] != "hello world" {
		t.Errorf("String mismatch: %v", loadedJSON["string"])
	}
	// JSON numbers are often float64 when unmarshaled into interface{}
	if val, ok := loadedJSON["int"].(float64); !ok || val != 42 {
		t.Errorf("Int mismatch: %v (%T)", loadedJSON["int"], loadedJSON["int"])
	}
	if loadedJSON["special_chars"] != "你好!@#$%^&*()_+" {
		t.Errorf("Special chars mismatch: %v", loadedJSON["special_chars"])
	}

	nested := loadedJSON["nested"].(map[string]interface{})
	array := nested["array"].([]interface{})
	if len(array) != 3 {
		t.Errorf("Array length mismatch")
	}
}

func TestErrorRecovery(t *testing.T) {
	db, tempDir := setupTestDB(t)
	defer db.Close()
	defer os.RemoveAll(tempDir)

	store := NewSQLiteExecutionStore(db)
	runID, _ := store.CreateExecution("error_wf")

	// 1. Valid Step
	store.RecordStep(runID, ExecutionStep{NodeID: "n1", Status: "success", StartTime: time.Now()})

	// 2. Simulate Status Update Failure (e.g. invalid ID, though SQL usually just returns 0 rows)
	// Let's test standard error reporting logic
	err := store.UpdateExecutionStatus("non_existent_id", "error")
	if err != nil {
		// Just ensuring it doesn't panic. SQLite might not error on 0 rows affected depending on driver config.
	}

	// 3. Verify consistency
	// The original execution should still be "running"
	row := db.QueryRow("SELECT status FROM executions WHERE id = ?", runID)
	var status string
	row.Scan(&status)
	if status != "running" {
		t.Errorf("Execution status should remain running, got %s", status)
	}

	// 4. Update to Error
	store.UpdateExecutionStatus(runID, "error")
	row = db.QueryRow("SELECT status, end_time FROM executions WHERE id = ?", runID)
	var endTime sql.NullTime
	row.Scan(&status, &endTime)
	if status != "error" {
		t.Errorf("Status failed to update to error")
	}
	if !endTime.Valid {
		t.Errorf("End time was not set on error")
	}
}
