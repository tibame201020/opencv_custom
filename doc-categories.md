# 專案文件知識庫 (doc-categories.md)

> **⚠️ 核心修改規範 (Core Contribution Rules)**
> 本專案功能龐大且各模組深度耦合。為了讓 AI 開發助手（Agent）能安全、精確地修改系統，**在變更任何功能前，必須先閱讀對應的模組文件**。
> 
> 1. **導航與定位**：本文件作為 Root 索引（類似 Skills），將指引你前往 `docs/` 目錄下的各個子系統文件。
> 2. **同步更新承諾**：若變更了節點（Node）、資料庫（Schema）或前後端（API/Bridge）設計，**必須同步更新對應的文件**。
> 3. **文件補充承諾**：若在實作或修改過程中，發現目前有功能或模組尚未記錄在現有的文檔中，**必須按照當前 `docs/` 的目錄結構與知識庫格式，主動新增對應的說明文件**並更新本索引，確保知識庫不遺漏。
---

## 🧭 模組文件導航 (Navigation)

### 1. 工作流引擎 (Workflow Engine)
工作流是本系統的核心，包含前端的畫布互動與後端的圖解執行。
- [Backend Engine 架構與執行邏輯 (`docs/workflow/backend_engine.md`)](docs/workflow/backend_engine.md)
  - 涵蓋 `engine.go`, Executor 實作, BFS 走訪, Signal 分支控制與 Expression 解析。
- [Frontend Canvas 視覺引擎 (`docs/workflow/frontend_canvas.md`)](docs/workflow/frontend_canvas.md)
  - 涵蓋 React Flow, NodeRegistry 配置, n8n-Style Handles, 邊線 (Edge) 工具列與右鍵行為優化。
- [如何新增自訂 Node? Checklist (`docs/workflow/node_development.md`)](docs/workflow/node_development.md)
  - 涵蓋從前端 UI 到後端執行、再到 Python 控制的完整追加節點步驟。

### 2. 跨平台通訊與設備橋接 (Core & Bridge)
處理 Go Server 與 Python OpenCV/ADB 腳本的溝通。
- [Python Bridge 整合與設計 (`docs/core/python_bridge.md`)](docs/core/python_bridge.md)
  - 涵蓋 JSON-RPC 通訊, `process_manager`, `workflow_bridge.py`, 以及 ADB 設備控制與尋找圖示邏輯。

### 3. 資料庫與持久化 (Database & Storage)
統一採用 SQLite 處理所有狀態儲存與查詢。
- [Database Schema 與遷移計畫 (`docs/database/schema_and_migration.md`)](docs/database/schema_and_migration.md)
  - 涵蓋 `db.go` 表格設計, `workflow_db.go` 對工作流的儲存與還原邏輯。

### 4. 前端資料流與 API (Frontend Store & API)
- [Zustand Store 與 Wails API Bind (`docs/frontend/api_and_store.md`)](docs/frontend/api_and_store.md)
  - 涵蓋 Store 狀態管理、專案資產 (Assets) API 與腳本編輯器視圖。

---
*維護者提醒：如果你在專案中加入了全新的子系統或目錄架構，請更新此 `doc-categories.md` 添加新的路徑與分類。*
