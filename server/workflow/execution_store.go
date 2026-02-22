package workflow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// ExecutionStore defines the interface for persisting workflow execution state
type ExecutionStore interface {
	CreateExecution(workflowID string) (string, error)
	UpdateExecutionStatus(runID string, status string) error
	RecordStep(runID string, step ExecutionStep) error
	GetExecution(runID string) (*ExecutionResult, error)
}

// SQLiteExecutionStore implements ExecutionStore using SQLite
type SQLiteExecutionStore struct {
	DB *sql.DB
}

// NewSQLiteExecutionStore creates a new store
func NewSQLiteExecutionStore(db *sql.DB) *SQLiteExecutionStore {
	return &SQLiteExecutionStore{DB: db}
}

func (s *SQLiteExecutionStore) CreateExecution(workflowID string) (string, error) {
	// Simple run ID generation (using time for now, or could inject UUID)
	runID := fmt.Sprintf("%s-%d", workflowID, time.Now().UnixNano())
	_, err := s.DB.Exec(`
		INSERT INTO executions (id, workflow_id, status, start_time)
		VALUES (?, ?, 'running', CURRENT_TIMESTAMP)
	`, runID, workflowID)
	return runID, err
}

func (s *SQLiteExecutionStore) UpdateExecutionStatus(runID string, status string) error {
	_, err := s.DB.Exec(`
		UPDATE executions
		SET status = ?, end_time = CASE WHEN ? IN ('success', 'error', 'cancelled') THEN CURRENT_TIMESTAMP ELSE end_time END
		WHERE id = ?
	`, status, status, runID)
	return err
}

func (s *SQLiteExecutionStore) RecordStep(runID string, step ExecutionStep) error {
	outputJSON, _ := json.Marshal(step.Output)
	_, err := s.DB.Exec(`
		INSERT INTO execution_steps (execution_id, node_id, node_name, node_type, status, start_time, end_time, duration, output)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, runID, step.NodeID, step.NodeName, step.NodeType, step.Status, step.StartTime, step.EndTime, step.Duration, string(outputJSON))
	return err
}

func (s *SQLiteExecutionStore) GetExecution(runID string) (*ExecutionResult, error) {
	// Reconstruct result from steps
	rows, err := s.DB.Query(`
		SELECT node_id, node_name, node_type, status, start_time, end_time, duration, output
		FROM execution_steps
		WHERE execution_id = ?
		ORDER BY start_time ASC
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []ExecutionStep
	var finalOutput map[string]ExecutionData

	for rows.Next() {
		var step ExecutionStep
		var outputStr string
		err := rows.Scan(&step.NodeID, &step.NodeName, &step.NodeType, &step.Status, &step.StartTime, &step.EndTime, &step.Duration, &outputStr)
		if err != nil {
			return nil, err
		}
		if outputStr != "" {
			json.Unmarshal([]byte(outputStr), &step.Output)
		}
		steps = append(steps, step)
		finalOutput = step.Output // Last step's output is final? Roughly.
	}

	return &ExecutionResult{
		Output:        finalOutput,
		ExecutionPath: steps,
	}, nil
}
