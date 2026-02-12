package workflow

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"script-platform/server/db"
)

// SaveWorkflow 儲存完整的 Workflow 定義到資料庫
func SaveWorkflow(wf *Workflow) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 插入或更新 Workflow 主表
	_, err = tx.Exec(`
		INSERT INTO workflows (id, project_id, name, description, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET 
			project_id = excluded.project_id,
			name = excluded.name,
			description = excluded.description,
			updated_at = CURRENT_TIMESTAMP
	`, wf.ID, wf.ProjectID, wf.Name, wf.Description)
	if err != nil {
		return fmt.Errorf("failed to save workflow meta: %v", err)
	}

	// 2. 清除現有的節點與邊
	_, err = tx.Exec("DELETE FROM nodes WHERE workflow_id = ?", wf.ID)
	if err != nil {
		return err
	}
	_, err = tx.Exec("DELETE FROM edges WHERE workflow_id = ?", wf.ID)
	if err != nil {
		return err
	}

	// 3. 插入節點
	for _, node := range wf.Nodes {
		configJSON, _ := json.Marshal(node.Config)
		_, err = tx.Exec(`
			INSERT INTO nodes (id, workflow_id, name, type, config, x, y)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, node.ID, wf.ID, node.Name, node.Type, string(configJSON), node.X, node.Y)
		if err != nil {
			return fmt.Errorf("failed to save node %s: %v", node.ID, err)
		}
	}

	// 4. 插入邊
	for _, edge := range wf.Edges {
		_, err = tx.Exec(`
			INSERT INTO edges (id, workflow_id, from_node_id, to_node_id, signal)
			VALUES (?, ?, ?, ?, ?)
		`, edge.ID, wf.ID, edge.FromNodeID, edge.ToNodeID, edge.Signal)
		if err != nil {
			return fmt.Errorf("failed to save edge %s: %v", edge.ID, err)
		}
	}

	return tx.Commit()
}

// GetWorkflow 從資料庫讀取完整的 Workflow
func GetWorkflow(id string) (*Workflow, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	wf := &Workflow{
		ID:    id,
		Nodes: make(map[string]*WorkflowNode),
		Edges: []WorkflowEdge{},
	}

	// 1. 讀取 Workflow Meta
	var desc sql.NullString
	err := db.DB.QueryRow("SELECT project_id, name, description FROM workflows WHERE id = ?", id).Scan(&wf.ProjectID, &wf.Name, &desc)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("workflow %s not found", id)
		}
		return nil, err
	}
	wf.Description = desc.String

	// 2. 讀取節點
	rows, err := db.DB.Query("SELECT id, name, type, config, x, y FROM nodes WHERE workflow_id = ?", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		node := &WorkflowNode{}
		var configStr sql.NullString
		var nx, ny sql.NullFloat64
		err := rows.Scan(&node.ID, &node.Name, &node.Type, &configStr, &nx, &ny)
		if err != nil {
			return nil, fmt.Errorf("node scan error: %v", err)
		}

		if configStr.Valid && configStr.String != "" {
			json.Unmarshal([]byte(configStr.String), &node.Config)
		} else {
			node.Config = make(map[string]interface{})
		}

		if nx.Valid {
			node.X = nx.Float64
		}
		if ny.Valid {
			node.Y = ny.Float64
		}

		wf.Nodes[node.ID] = node
	}

	// 3. 讀取邊
	edgeRows, err := db.DB.Query("SELECT id, from_node_id, to_node_id, signal FROM edges WHERE workflow_id = ?", id)
	if err != nil {
		return nil, err
	}
	defer edgeRows.Close()

	for edgeRows.Next() {
		edge := WorkflowEdge{}
		err := edgeRows.Scan(&edge.ID, &edge.FromNodeID, &edge.ToNodeID, &edge.Signal)
		if err != nil {
			return nil, err
		}
		wf.Edges = append(wf.Edges, edge)
	}

	return wf, nil
}

// ListProjects 列出所有專案及其工作流
func ListProjects() ([]map[string]interface{}, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	rows, err := db.DB.Query("SELECT id, name, platform, description FROM projects ORDER BY updated_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []map[string]interface{}
	for rows.Next() {
		var id, name string
		var platform, description sql.NullString
		err := rows.Scan(&id, &name, &platform, &description)
		if err != nil {
			return nil, err
		}

		project := map[string]interface{}{
			"id":          id,
			"name":        name,
			"platform":    platform.String,
			"description": description.String,
			"workflows":   []map[string]interface{}{},
		}

		// Fetch workflows for this project
		wfRows, err := db.DB.Query("SELECT id, name, description FROM workflows WHERE project_id = ? ORDER BY created_at ASC", id)
		if err == nil {
			var workflows []map[string]interface{}
			for wfRows.Next() {
				var wId, wName string
				var wDesc sql.NullString
				if err := wfRows.Scan(&wId, &wName, &wDesc); err == nil {
					workflows = append(workflows, map[string]interface{}{
						"id":          wId,
						"name":        wName,
						"description": wDesc.String,
					})
				}
			}
			wfRows.Close()
			project["workflows"] = workflows
		}

		projects = append(projects, project)
	}
	return projects, nil
}

// SaveProject 儲存或更新專案
func SaveProject(id, name, platform, description string) error {
	_, err := db.DB.Exec(`
		INSERT INTO projects (id, name, platform, description, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET 
			name = excluded.name,
			platform = excluded.platform,
			description = excluded.description,
			updated_at = CURRENT_TIMESTAMP
	`, id, name, platform, description)
	return err
}

// RenameProject 重命名專案
func RenameProject(id, newName string) error {
	if db.DB == nil {
		return fmt.Errorf("database not initialized")
	}
	_, err := db.DB.Exec("UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newName, id)
	return err
}

// DeleteProject 刪除專案 (Cascade delete workflows)
func DeleteProject(id string) error {
	if db.DB == nil {
		return fmt.Errorf("database not initialized")
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get all workflow IDs in this project
	rows, err := tx.Query("SELECT id FROM workflows WHERE project_id = ?", id)
	if err != nil {
		return err
	}
	var wfIds []string
	for rows.Next() {
		var wId string
		if err := rows.Scan(&wId); err == nil {
			wfIds = append(wfIds, wId)
		}
	}
	rows.Close()

	// 2. Delete nodes and edges for each workflow
	for _, wId := range wfIds {
		_, err = tx.Exec("DELETE FROM edges WHERE workflow_id = ?", wId)
		if err != nil {
			return err
		}
		_, err = tx.Exec("DELETE FROM nodes WHERE workflow_id = ?", wId)
		if err != nil {
			return err
		}
	}

	// 3. Delete workflows
	_, err = tx.Exec("DELETE FROM workflows WHERE project_id = ?", id)
	if err != nil {
		return err
	}

	// 4. Delete project
	_, err = tx.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// RenameWorkflow 重命名 Workflow
func RenameWorkflow(id, newName string) error {
	if db.DB == nil {
		return fmt.Errorf("database not initialized")
	}
	_, err := db.DB.Exec("UPDATE workflows SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newName, id)
	return err
}
