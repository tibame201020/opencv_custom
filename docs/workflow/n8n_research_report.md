# n8n Script-like Workflow 研究報告

## 1. 執行概況 (Overview)

成功登入本地 n8n (`localhost:5678`) 並建立了一個包含變數設定、條件判斷與分支執行的 Workflow。

- **Variables**: 使用 `Edit Fields (Set)` 節點定義全域變數 (如 `debug_mode`)。
- **Conditions**: 使用 `If` 節點，配合 Expression (`{{ $json.debug_mode }}`) 讀取變數。
- **Execution**: 執行後可清楚看到綠色勾勾 (Success Path) 與節點間的資料流動。

## 2. 關鍵功能截圖

### 設定變數 (Set Node)
n8n 透過 "Edit Fields" 節點將資料寫入 Context。這是目前我們的系統最缺乏的「狀態管理」機制。

> *(截圖略，參考 artifact 原始報告)*

### 3. 核心發現 (Key Findings)

1.  **Context Management**: n8n 的核心在於資料隨時可被後續節點存取 (`$json` 或 `$node["Name"].json`)。我們的系統目前只有單向傳遞。
2.  **Expression Power**: n8n 的 Expression Editor 非常強大，支援 JS 語法。我們的 `if_condition` 目前只有 Hardcoded string check。
3.  **Visual Feedback**: 執行後的路徑 visualization (綠色連線) 對於除錯非常重要。

## 4. 對應優化建議

請參閱同時產出的 [Virtual-Workflow Optimization Plan](optimization_plan.md) 了解具體實作建議。
