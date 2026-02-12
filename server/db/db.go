package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/glebarez/go-sqlite"
)

var DB *sql.DB

// Init初始化資料庫
func Init(dbPath string) error {
	// 確保目錄存在
	dir := filepath.Dir(dbPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create db directory: %v", err)
		}
	}

	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	if err = createSchema(); err != nil {
		return fmt.Errorf("failed to create schema: %v", err)
	}

	fmt.Println("Database initialized at:", dbPath)
	return nil
}

func createSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			platform TEXT DEFAULT 'android',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS workflows (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS nodes (
			id TEXT PRIMARY KEY,
			workflow_id TEXT NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			config TEXT, -- JSON string for node specific settings
			x REAL,
			y REAL,
			FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS edges (
			id TEXT PRIMARY KEY,
			workflow_id TEXT NOT NULL,
			from_node_id TEXT NOT NULL,
			to_node_id TEXT NOT NULL,
			signal TEXT NOT NULL,
			FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
			FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
			FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
		);`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return err
		}
	}

	// Migration: Ensure workflows table has project_id column
	// We use a simple ALTER TABLE. If it fails because column exists, it's fine.
	_, _ = DB.Exec("ALTER TABLE workflows ADD COLUMN project_id TEXT DEFAULT 'default'")

	return nil
}

// Close 關閉資料庫
func Close() {
	if DB != nil {
		DB.Close()
	}
}
