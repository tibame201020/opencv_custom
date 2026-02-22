# Workflow 引擎優化與重構計畫

本文件旨在規劃 ScriptPlatform Workflow 引擎的長期演進方向，解決目前的架構限制並提升系統的可維護性、擴充性與穩定性。

## 1. 現狀分析 (Current Architecture & Limitations)

### 1.1 資料結構 (Data Structure)
*   **問題**: 目前後端 `Workflow` struct 使用 `map[string]*WorkflowNode` 儲存節點。
*   **影響**:
    *   **順序丟失**: Map 是無序的，導致節點在序列化 (JSON/DB) 時順序不固定。這影響前端的渲染層級 (Z-Index) 與 "Bring to Front" 等功能。
    *   **一致性**: 前端 React Flow 使用 Array，後端使用 Map，導致儲存與讀取時需要進行轉換，增加了複雜度與潛在 Bug。

### 1.2 執行器模式 (Executor Pattern)
*   **問題**: `server/workflow/executor.go` 中的 `createBuiltinExecutor` 使用巨大的 `switch-case` 來分派節點邏輯。
*   **影響**:
    *   **難以維護**: 隨著節點類型增加，該函數會變得極其龐大且難以閱讀。
    *   **耦合度高**: 所有節點邏輯耦合在一起，修改一個節點可能影響整體。
    *   **測試困難**: 難以針對單一節點類型進行獨立的單元測試。

### 1.3 狀態管理 (State Management)
*   **問題**: `FlowEngine` 僅在記憶體中維護 `ExecutionState`。
*   **影響**:
    *   **無持久化**: 若服務重啟或崩潰，執行進度將完全丟失，無法支援長時運行的腳本或斷點續傳。
    *   **除錯困難**: 缺乏歷史執行記錄的查詢機制。

### 1.4 錯誤處理 (Error Handling)
*   **問題**: 錯誤通常被封裝在 `success: false` 或簡單的錯誤訊息字串中。
*   **影響**: 前端難以區分是「邏輯錯誤」(如條件不符) 還是「系統錯誤」(如 Python Bridge 斷線)，限制了自動化錯誤恢復的可能性。

---

## 2. 優化方案 (Proposed Improvements)

### Phase 1: 核心重構與資料統一 (Core Refactoring & Unification)
**目標**: 解決最迫切的維護性與一致性問題。

#### 2.1 執行器註冊制 (Registry Pattern)
*   **設計**: 引入 `NodeExecutorRegistry`，允許各個節點類型在 `init()` 時自行註冊。
*   **實作**:
    ```go
    // 定義介面
    type NodeExecutor interface {
        Execute(ctx context.Context, arg NodeArg) NodeOutput
    }

    // 註冊機制
    var executors = make(map[NodeType]func() NodeExecutor)

    func RegisterExecutor(t NodeType, factory func() NodeExecutor) {
        executors[t] = factory
    }
    ```
*   **效益**: 解耦節點邏輯，支援插件化擴充。

#### 2.2 資料結構統一 (Map -> Slice)
*   **設計**: 將 `Workflow` struct 中的 `Nodes` 改為 `[]*WorkflowNode`。
*   **實作**:
    *   修改 DB schema 或 JSON 序列化邏輯，確保順序被保留。
    *   在 `FlowEngine` 初始化時建立 `ID -> Node` 的 lookup map 以維持 O(1) 存取效能。
    *   前端 `WorkflowView` 同步調整，直接使用 Array 進行狀態管理。
*   **效益**: 解決 Z-Index 問題，簡化前後端資料交換。

### Phase 2: 持久化與可靠性 (Persistence & Reliability)
**目標**: 提升系統在長時運行下的穩定性。

#### 2.3 執行狀態持久化 (State Persistence)
*   **設計**: 引入 `ExecutionStore` 介面，支援 SQLite 或 BadgerDB。
*   **實作**:
    *   在 `FlowEngine` 的每一步驟 (`Step`) 結束後，將 `ExecutionStep` 寫入 DB。
    *   實作 `ResumeWorkflow(runID string)` API，從 DB 讀取最後狀態並恢復執行。
*   **效益**: 支援斷點續傳、崩潰恢復、歷史記錄查詢。

#### 2.4 結構化錯誤處理 (Structured Error Handling)
*   **設計**: 定義標準錯誤類型 `WorkflowError`，包含錯誤代碼 (Code)、訊息 (Message) 與可恢復性 (Retryable)。
*   **實作**:
    *   Executor 回傳 `error` 而非僅在 Output 中標記。
    *   Engine 根據錯誤類型決定是否重試 (Retry) 或中斷。

### Phase 3: 進階功能 (Advanced Features)
**目標**: 支援更複雜的業務場景。

#### 2.5 併發執行 (Concurrency)
*   **設計**: 重構 `Execute` 迴圈，支援 `Goroutine` 池。
*   **場景**: `Parallel` 節點或 `Map` (Fan-out/Fan-in) 操作。

#### 2.6 子流程優化 (Sub-workflow)
*   **設計**: 支援子流程的獨立版本控制與參數傳遞優化。

---

## 3. 實施路徑 (Implementation Roadmap)

1.  **Step 1 (Immediate)**: 建立 `NodeExecutor` 介面與註冊機制，重構現有的 `switch-case`。
2.  **Step 2 (Immediate)**: 修改 `Workflow` struct，將 `Nodes` 改為 Slice，並更新 DB 與測試。
3.  **Step 3 (Short-term)**: 前端對接新的資料結構。
4.  **Step 4 (Mid-term)**: 設計並實作 `ExecutionStore` (SQLite)。
5.  **Step 5 (Long-term)**: 評估併發執行的需求與實作。

## 4. 追蹤與維護 (Tracking)
本文件應隨專案進展持續更新。每次完成一個 Phase 或重大重構後，應回頭檢視此計畫並調整後續步驟。
