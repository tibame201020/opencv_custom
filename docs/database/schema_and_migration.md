# Database Schema 與遷移計畫 (SQLite Storage)

> **相關目錄**: `/server/db/db.go`, `/server/workflow/workflow_db.go`

本專案使用 SQLite 作為本地資料庫。主要儲存使用者的專案清單 (Projects)、腳本工作流 (Workflows) 及其配置 (Nodes/Edges)，以及歷史執行記錄 (Executions)。

## 1. 資料庫結構 (Schema Design)

核心表格與其約束定義於 `db.go` 的 `createSchema()` 中。 

### 核心表格 (Core Tables)
* **`projects`**: 存放專案基礎資料 (id, name, platform=android)。
* **`workflows`**: 工作流中繼資料 (id, project_id, name, description)。 
  **(FK: project_id -> projects.id)** 
* **`nodes`**: 工作流節點配置 (id, workflow_id, name, type, config, x, y, disabled)。
  - **`config`** 是 TEXT 欄位，存放 JSON string 以應付彈性結構的節點。
  - **`disabled`** 是 BOOLEAN (整數 0/1)，處理在未刪除節點的情況下的暫停與跳過 (Pass-through) 邏輯。
  **(FK: workflow_id -> workflows.id)** 
* **`edges`**: 工作流連線資訊 (id, workflow_id, from_node_id, to_node_id, signal)。 
  **(FK: workflow_id -> workflows.id, FK: node_id -> nodes.id)** 
* **`executions`** & **`execution_steps`**: 紀錄歷史與逐節點 (Step) 即時狀態。

## 2. 存取設計 (`workflow_db.go`)
所有的工作流存取被封裝在 `workflow_db.go`：
- **`SaveWorkflow(wf)`**:
  1. 使用 SQL Transaction `Begin()`。
  2. 插入/更新 `workflows`。
  3. **清除**舊有的 `nodes` 與 `edges`。
  4. 從 `wf.Nodes` 重新插入所有 `nodes`（序列化 `Node.Config` 到 JSON）。
  5. 重新插入所有的 `edges`。
  6. `Commit()` 完成。這是一次性覆寫。
- **`GetWorkflow(id)`**:
  - 先查詢 `workflows` 取得 Metadata，再將對應的所有 `nodes` 和 `edges` 查詢回來。
  - 對 `node.config` 欄位執行 JSON 反序列化，塞回 `WorkflowNode{}` 的 Map 結構。若剛新增了新的 Table 欄位 (如 `x`, `y`, `disabled`)，也必須在此手動 Scan。

## 3. Schema 遷移策略 (Migration Strategy)
目前沒有複雜的 ORM (如 Gorm)。遷移 (Migration) 直接寫死在 `db.go:createSchema()` 裡面：
```go
// 例如新增 disabled 欄位時：
_, _ = DB.Exec("ALTER TABLE nodes ADD COLUMN disabled BOOLEAN DEFAULT 0")
```
- 開發者**非常依賴**這種冪等（Idempotent）或可安全失敗 (Safe-fail) 的 `ALTER TABLE` 作法來處理架構更新。
- 每次 Server 啟動必定檢查/執行過所有 `CREATE TABLE IF NOT EXISTS` 以及 Migration SQL。

## 4. 變更規範 (Contribution Rule)
1. 如果要將任一 Workflow 的實體屬性擴充（例如增加節點延遲參數、增加變數環境等）：
   1. 首先更動 Go Struct (`Workflow` / `WorkflowNode`)。
   2. 修改 `db.go` 加入 `ALTER TABLE` 遷移語法。
   3. 修改 `workflow_db.go` 內的 **Save** 與 **Get** 的 `INSERT`/`SELECT` 查詢，補齊該欄位的讀寫對應。
   4. 修改 `workflow_db_test.go` 加入這個欄位的序列化驗證。
