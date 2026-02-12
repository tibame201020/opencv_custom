# TODO — Feature Tracking

> 此文件追蹤所有功能的實作進度與使用者確認狀態。
> - ✅ = 已完成 / 已確認
> - 🔄 = 進行中
> - ⬜ = 尚未開始 / 尚未確認
> - ❌ = 已取消或移除

---

## 1. Workflow Engine (Backend — Go)

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 1.1 | `ExecutionResult.Signal` 欄位 | ✅ | ⬜ | 支援 flow control |
| 1.2 | `convert` 節點類型 | ✅ | ⬜ | 資料轉換 |
| 1.3 | Sub-workflow Signal 傳播 | ✅ | ⬜ | 子流程回傳實際 signal |
| 1.4 | Loop 節點重構 (pass-through) | ✅ | ⬜ | 迴圈邏輯改由 Graph 組合 |
| 1.5 | Workflow 持久化 (SQLite) | ✅ | ⬜ | CRUD API |
| 1.6 | Node Discovery API (`/api/workflows/nodes`) | ✅ | ⬜ | 動態偵測可用節點 |
| 1.7 | Workflow 執行 API (`/api/workflows/run`) | ✅ | ⬜ | 執行工作流 |
| 1.8 | Global Context & Variables | ✅ | ⬜ | 跨節點變數存取 |
| 1.9 | Expression Parser ({{ }}) | ✅ | ⬜ | 動態參數解析 |
| 1.10 | If Condition Operators (55 types) | ✅ | ⬜ | 完整運算子支援 |

## 2. Workflow Engine (Tests)

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 2.1 | WhileLoop 測試 | ✅ | ⬜ | |
| 2.2 | ForLoop 測試 | ✅ | ⬜ | |
| 2.3 | ForEach 測試 | ✅ | ⬜ | |
| 2.4 | CaseWhen 測試 | ✅ | ⬜ | |
| 2.5 | NestedSubflow 測試 | ✅ | ⬜ | |
| 2.6 | SignalPropagation 測試 | ✅ | ⬜ | |

## 3. Frontend — Workflow 視覺編輯器

### 3.1 基礎架構

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.1.1 | React Flow DAG 編輯器 | ✅ | ⬜ | `@xyflow/react` |
| 3.1.2 | Workflow Store (狀態管理) | ✅ | ⬜ | Zustand |
| 3.1.3 | 路由與導覽整合 | ✅ | ⬜ | Workflow Tab |
| 3.1.4 | IDE 風格佈局 (雙層 Sidebar) | ✅ | ⬜ | 與 Script Editor 一致 |
| 3.1.5 | Tab 頁籤系統 | ✅ | ⬜ | 多工作流切換 |
| 3.1.6 | Node Registry (節點定義) | ✅ | ⬜ | 集中管理節點類型 |

### 3.2 節點互動

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.2.1 | 拖放節點 (Drag & Drop) | ✅ | ⬜ | 從 Palette 拖入 |
| 3.2.2 | 選取高亮 (Dashed Border) | ✅ | ⬜ | 取消外圈光暈 |
| 3.2.3 | 節點調整大小 (NodeResizer) | ✅ | ⬜ | 圓形 Handle |
| 3.2.4 | 雙擊開啟屬性面板 | ✅ | ⬜ | 單擊僅選取 |
| 3.2.5 | 節點複製/貼上 (Ctrl+C/V) | ✅ | ⬜ | |
| 3.2.6 | 節點複製 (Ctrl+D) | ✅ | ⬜ | |
| 3.2.7 | 全選 (Ctrl+A) | ✅ | ⬜ | |
| 3.2.8 | 刪除 (Delete/Backspace) | ✅ | ⬜ | |

### 3.3 邊 (Edge) 互動

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.3.1 | SmoothStep 路由 | ✅ | ⬜ | 正交路由 |
| 3.3.2 | 邊可選取/刪除 | ✅ | ⬜ | `interactionWidth: 20` |
| 3.3.3 | 拖曳端點重新連接 | ✅ | ⬜ | `updatable: true` |

### 3.4 畫布互動

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.4.1 | 框選 (Box Selection) | ✅ | ⬜ | 左鍵拖曳 |
| 3.4.2 | 右鍵平移 | ✅ | ⬜ | `panOnDrag={[2]}` |
| 3.4.3 | 滾輪平移 | ✅ | ⬜ | `panOnScroll` |

### 3.5 右鍵選單 (Context Menu)

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.5.1 | 節點右鍵選單 | ✅ | ⬜ | Properties / Duplicate / Front / Back / Delete |
| 3.5.2 | 邊右鍵選單 | ✅ | ⬜ | Delete |
| 3.5.3 | 畫布右鍵選單 | ✅ | ⬜ | 目前為空 (清除選取) |

### 3.6 Z-Index 圖層控制

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.6.1 | Bring to Front | ✅ | ⬜ | 從右鍵選單操作 |
| 3.6.2 | Send to Back | ✅ | ⬜ | 從右鍵選單操作 |

### 3.7 復原/重做 (Undo/Redo)

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.7.1 | Undo (Ctrl+Z) | ❌ | — | 已取消：拖曳時快照造成效能問題 |
| 3.7.2 | Redo (Ctrl+Y / Ctrl+Shift+Z) | ❌ | — | 已取消 |
| 3.7.3 | 自動快照 (Drag/Connect/Delete) | ❌ | — | 已取消 |

### 3.8 屬性面板

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 3.8.1 | 動態參數表單 (ParamField) | ✅ | ⬜ | 支援多種型別 |
| 3.8.2 | Expression Mode 切換 | ✅ | ⬜ | `{{ }}` 語法 |
| 3.8.3 | Variables 管理面板 | ✅ | ⬜ | CRUD |
| 3.8.4 | 可收合式側欄 | ✅ | ⬜ | 右側收合 |
| 3.8.5 | Set Variable Node (JSON) | ✅ | ⬜ | Monaco Editor |
| 3.8.6 | Expression Mode Toggle | ✅ | ⬜ | 參數動態切換 |

## 4. Bug Fixes

| # | 問題 | 修復狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 4.1 | Python CLI UTF-8 Encoding (CP950) | ✅ | ⬜ | Windows 環境 |
| 4.2 | Node Discovery 500 Error | ✅ | ⬜ | API 解析修復 |

---

## 5. 待開發 / 規劃中

| # | 功能 | 實作狀態 | User 確認 | 備註 |
|---|------|---------|-----------|------|
| 5.1 | Workflow 版本控制 | ⬜ | ⬜ | 版本歷史/回滾 |
| 5.2 | Workflow 匯入/匯出 (JSON) | ⬜ | ⬜ | |
| 5.3 | Workflow 執行結果可視化 | ⬜ | ⬜ | 節點狀態標示 |
| 5.4 | 節點群組化 (Grouping) | ⬜ | ⬜ | Sub-workflow 視覺化 |
| 5.5 | 搜尋節點 (畫布內) | ⬜ | ⬜ | Ctrl+F |
| 5.6 | Mini-map 互動優化 | ⬜ | ⬜ | |
| 5.7 | 畫布 Snap-to-Grid | ⬜ | ⬜ | 對齊輔助 |
| 5.8 | 邊 Label 編輯 | ⬜ | ⬜ | Signal 標籤 |
