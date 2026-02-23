# Backend Engine 架構與執行邏輯

> **相關目錄**: `/server/workflow/`

此文件描述 Workflow Engine 在 Go Server 端的實作機制。任何涉及節點邏輯、執行流程變更時，必須參閱此處。

## 1. 核心結構 (Core Structures)
- **`Workflow`**: 工作流的主要配置實體。包含 `ID`, `Nodes` (節點列表), `Edges` (連線列表), `StartNodeID` 等。
- **`WorkflowNode`**: 節點定義。包含：
  - `ID`, `Name`, `Type`
  - `Config`: `map[string]interface{}` (前端送來的 JSON 參數)
  - `Disabled`: `bool`，設定為 `true` 時跳過執行但繼續傳遞資料 (Pass-through)。
  - `Executor`: 該節點實際執行的函式指標 `func(ctx context.Context, arg NodeArg) NodeOutput`。
- **`WorkflowEdge`**: 定義節點流向。包含 `FromNodeID`, `ToNodeID` 與 `Signal` (作為分支路由的判斷條件)。

## 2. 執行流程 (Execution Flow)
入口為 `engine.go` 中的 `Execute(ctx, initialInput)`：
1. **初始化與索引建立**: 建立 `NodeMap` 與 `IncomingEdges` 來優化查找效率，找出沒有入邊的節點作為候選啟動節點（或由 `StartNodeID` 決定）。
2. **廣度優先走訪 (BFS)**:
   - 使用 Queue 存放即將執行的節點 ID 與攜帶的狀態資料 (`Input`)。
   - 自 Queue Pop 出節點後，根據 `Disabled` 狀態判斷：若為 `true` 直接 Pass-through input 到 `success` 分支。
   - 否則呼叫 `node.Executor`。
3. **Signal 路由**:
   - `Executor` 執行後返回 `NodeOutput`，這是一個 Map：`map[string][]ExecutionData`，Key 為 Signal（通常是 `"success"`, `"true"`, `"false"`）。
   - Engine 檢查接續的 `Edges`，找尋 `edge.FromNodeID == current_node && edge.Signal == current_signal` 的連線，將輸出的 ExecutionData 塞入 Queue 等待下一輪執行。
4. **結果收集**: 各節點執行後，將結果存入 `GlobalContext` 與 `NodeResults`（供 `{{ $node["Name"].json.xxx }}` 等變數語法解析呼叫）。

## 3. 內建節點實作 (Built-in Executors)
實作於 `executors_builtin.go`:
- 這邊大量使用了閉包（Closure）在節點建立時綁定設定檔（Config）或 PythonBridge 實例。
- **變數解析支援 (`ResolveExpression`)**: 在讀取 Config 內的值時（如字串），會先經過 `ResolveExpression` 處理 `{{ }}` 內的 JSON Path 表示法。

## 4. 變更規範 (Contribution Rule)
如果修改了 Engine 的走訪邏輯或是 WorkflowNode 結構：
1. 確保不破壞舊有執行歷史（Backward Compatibility）。
2. 確保 SQLite `workflow_db.go` 對應解析邏輯被更新。
3. 務必運行 `go test ./workflow/...` 確保各分支與迴圈測試未損壞。
