# 新增自訂 Node 完整開發指南 (Checklist)

> **相關目錄**: `/frontend/src/workflow/nodeRegistry.ts`, `/server/workflow/executors_builtin.go`, `/core/workflow_bridge.py`

此文件描述「如何在系統中新增或修改一個 Workflow Node」的標準操作程序。
當 AI Assistant 需要擴充系統功能時，請嚴格遵守此 Checklist 順序。

## 📝 開發 Checklist (Step-by-Step)

### Step 1. 前端 UI 註冊與定義 (Frontend Registry)
檔案: `/frontend/src/workflow/nodeRegistry.ts`

- [ ] 在 `NODE_DEFINITIONS` 陣列中新增物件定義。
  - `type`: Node 的內部 ID (ex: `find_image`, `set_variable`)。
  - `label`: 顯示在畫布與 Quick Add 選單的名稱。
  - `category`: 分類 (如 `vision`, `flow`, `trigger`)。必須存在於 `NodeCategory`。
  - `color`: 主題顏色對應。
  - `icon`: 顯示在工具列的 Lucide Icon 名稱。
  - `description`: 顯示在屬性面板的說明。
- [ ] 定義 `params` 欄位結構 (即為後端接收到的 `Config`)。
  - 支援的 `type`: `string`, `number`, `boolean`, `select`, `json`, `asset` (可開起圖庫選擇圖片)。
  - 如果該參數依賴其他參數，可以使用 `visibleIf` 條件。
- [ ] 完成此步驟後，前端在 Quick Add 與屬性面板就能看到此 Node 了。

### Step 2. 後端 Executor API 實作 (Backend Execution)
檔案: `/server/workflow/executors_builtin.go` 與 `executor.go`

1. 若為**系統內建邏輯 (如判斷、變量操作)**:
   - [ ] 在 `executors_builtin.go` 新增 `createXxxExecutor(node *WorkflowNode, bridge *PythonBridge, logger) NodeExecutor` 函式。
   - [ ] 讀取 `node.Config` 的參數前，務必使用 `ResolveExpression(ctx, arg, rawValue)` 以解析可能存在的變數模板 (如 `{{$node["A"].json.value}}`)。
   - [ ] 回傳 `NodeOutput`（通常是透過 `singleOutput("success", data)` 或依條件切換 Signal Key）。
   - [ ] 在 `WireBuiltinExecutors` 函式中將新 nodeType 與你的 Creator Function 綁定。
2. 若為**設備操作或 OpenCV 辨識 (委派 Python)**:
   - 不需要寫自訂 Executor!
   - 只要設定此 Node type 沒有註冊內建 Executor，Engine 預設會使用 `createBridgeExecutor` 將 Config 序列化並透過 RPC 送往 Python 端。

### Step 3. Python 端實作 (Core Bridge - 若為設備/辨識節點)
檔案: `/core/workflow_bridge.py`

- [ ] 在 `handle_execute(node_type, config, input_data)` 涵式中加入 `if node_type == "YOUR_NODE_TYPE":` 的分支。
- [ ] 擷取 `config` 中的參數值。
- [ ] 撰寫邏輯，例如呼叫 ADB (`device.sh()`) 或 OpenCV (`cv2.matchTemplate`)。
- [ ] 回傳結果 Dictionary。該結果會成為下一個節點的 `input_data` 與執行的 Output。

### Step 4. 單元測試驗證 (Unit Test)
檔案: `/server/workflow/engine_test.go` 或 `bridge_integration_test.go`

- [ ] 在 `engine_test.go` 撰寫一個測試案例 `Test[YourNode]logic()`。
- [ ] 組合一小段 Workflow (手動 new 出 Nodes 與 Edges)。
- [ ] 呼叫 `engine.Execute()` 並 `Assert` Output 資料流的正確性。
