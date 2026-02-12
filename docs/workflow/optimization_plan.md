# Virtual-Workflow Optimization Plan

基於 n8n 的深度研究與目前系統 (`opencv_custom`) 的審計，以下是針對「腳本式 Workflow」能力的優化分析與建議。

## 1. 現狀分析與差距 (Gap Analysis)

| 特性 | n8n (標竿) | Virtual-Workflow (現狀) | 差距嚴重度 |
|:---:|:---|:---|:---:|
| **變數管理** | **Global Context**：可隨時存取全域變數或任意節點的輸出 (`$node["A"].json`) | **Linear Pass-through**：僅能存取上一節點的 `Input`，無法跨節點存取。 | 🔴 Critical |
| **表達式 (Expressions)** | **JS-based**：`{{ $json.count > 5 }}`，支援字串插值與邏輯運算。 | **None / Naive**：`if_condition` 僅做簡單字串比對 (`"true"/"false"`)，無解析能力。 | 🔴 Critical |
| **資料流** | **Structured JSON**：節點間傳遞完整的 JSON 物件。 | **Any (Interface{})**：Go `interface{}` 傳遞，缺乏類型保證，依賴實作。 | 🟡 Moderate |
| **條件邏輯** | **Complex**：支援多種運算子 (String/Number/Array)。 | **Basic**：僅支援 `true/false` 分支 (前端已擴充 UI，但後端尚未支援邏輯)。 | 🔴 Critical |

## 2. 優化建議 (Optimization Proposals)

### Backend (Go Engine)

1.  **導入 Execution Context (執行上下文)**
    *   **目標**：解決「變數無法跨節點存取」的問題。
    *   **實作**：在 `FlowEngine` 中新增 `Context map[string]interface{}`，儲存全域變數與每個節點的執行結果。
    *   **變更檔案**：`server/workflow/engine.go`

2.  **實作 Expression Parser (表達式解析器)**
    *   **目標**：讓節點參數支援動態值 (如 `{{ variables.count }}`)。
    *   **實作**：
        *   引入輕量級表達式引擎 (如 `github.com/antonmedv/expr` 或簡單的正則替換)。
        *   在 `Executor` 執行前，自動解析所有 `Config` 中的表達式字串。
    *   **變更檔案**：`server/workflow/engine.go` (新增 `resolveConfig` 方法)

3.  **升級 If Condition Logic**
    *   **目標**：支援前端新做的 55 種運算子。
    *   **實作**：在 `if_condition` executor 中實作實際的比較邏輯 (Equals, Contains, GT/LT 等)，而非僅回傳 "true"。

### Frontend (UI/UX)

1.  **新增 `Set` (Variables) 節點**
    *   **目標**：讓使用者定義變數。
    *   **實作**：參照 n8n "Edit Fields" 節點，允許使用者新增 Key-Value 對。

2.  **實作 Expression Toggle (表達式切換)**
    *   **目標**：區分「固定值」與「表達式」。
    *   **實作**：在 `ParamField` 元件中新增切換按鈕 (Fixed / Expression)，表達式模式下顯示變數參照提示。

3.  **Variable Picker (變數選擇器)**
    *   **目標**：改善 UX，不用手打 `{{ ... }}`。
    *   **實作**：(選配) 在表達式輸入框旁提供變數清單，點擊插入。

## 3. 實作路徑 (Implementation Roadmap)

1.  **Phase 1: Engine Core (Backend)**
    *   修改 `FlowEngine` 結構，加入 `Scope/Context`。
    *   實作基礎 `Expression Parser` (支援 `{{ var }}` 語法)。
    *   更新 `if_condition` 支援運算子邏輯。

2.  **Phase 2: Frontend Components**
    *   實作 `Set` 節點 UI。
    *   實作 `Expression Input` 元件。

3.  **Phase 3: Integration**
    *   串接前後端，驗證「設定變數 -> 條件判斷 -> 分支執行」的完整流程。

## 4. 結論

目前的系統架構適合線性任務 (如 "Click" -> "Wait")，但要支援 "Script-like" (變數、迴圈、邏輯)，必須在後端引擎層加入 **State Management (Context)** 與 **Expression Evaluation** 機制。這是不動架構下的最小改動方案。
