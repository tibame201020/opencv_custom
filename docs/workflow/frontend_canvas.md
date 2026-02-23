# Frontend Canvas 視覺引擎與 UI

> **相關目錄**: `/frontend/src/views/WorkflowEditorView.tsx`, `/frontend/src/components/`, `/frontend/src/workflow/`

此文件描述前端工作流視覺編輯器（基於 React Flow）的架構。若需更改畫布互動、快捷鍵或是節點外觀，必須參閱此處。

## 1. 核心元件
- **React Flow (`<ReactFlow>`)**: 整個畫布的底層函式庫。設定了 `nodeTypes` 與 `edgeTypes`。
- **Zustand Store (`store.ts`)**: 保存著目前的 `workflowData` (JSON 格式)，並管理跨元件（如 Sidebar, Editor）的狀態。

## 2. 節點渲染 (`N8nNode.tsx`)
這是自定義的節點元件，負責處理：
- **視覺呈現**: 根據 `NodeCategory` 決定顏色、Icon。
- **執行狀態 (Status)**: 如果處於 Running 狀態，會有藍色呼吸燈的邊框。
- **輸入/輸出 Handles**: 用於連線。特別注意 Handle 的大小與 `top` 計算邏輯（確保對齊）。支援根據節點配置 (例如 `list` 類型的陣列參數) 動態生成與增減輸出 Handle (如 Switch 節點)。
- **n8n-Style Output Handle Strip**: 所有 Output Handle 皆採用 `○ label ——— +` 的佈局，label / 線段 / 加號永遠可見於節點右側邊緣外。多輸出節點 (If, Switch, Loop) 會顯示條件標籤 (如 `true`, `foo`, `Default`)；單輸出節點僅顯示線段與加號。標籤為灰色細字 (8px, font-normal) 的提示風格。
- **Click vs Drag 分離**: `+` 按鈕的 mousedown 不會立即 forward 給 React Flow Handle，而是監聽 mousemove 判斷：移動 > 5px 才啟動連線拖曳，否則 mouseup 觸發 Quick Add 面板。
- **工具列 (Toolbar)**: 滑鼠移上時顯示的 Floating Toolbar (Disable/Enable, Delete)，無背景、緊貼節點上方 (-18px)。
- **Image Preview**: 若該節點有選取資產（Asset），會在節點下方預覽截圖。

## 3. 連線邊緣 (`HoverEdge.tsx`)
取代預設連線的自訂元件，負責：
- 渲染 `Smart Edge Routing`（正交或貝茲曲線）。
- 僅顯示執行後的資料計數 (e.g. `1 item`)，不再顯示靜態條件標籤 (如 `true`/`false`)，因為條件資訊已由節點上的 Output Handle 標籤負責。
- Hover/選取時在邊線**中點**顯示透明工具列 (Add Node / Delete Connection)。

## 4. 視圖控制器 (`WorkflowEditorView.tsx`)
作為最大的 Container Component：
- **快捷鍵綁定**: 處理 `Ctrl+A`, `Delete`, `Ctrl+C`, `Ctrl+V`。
- **同步機制 (Sync Effect)**: 監聽 `nodes` 與 `edges` 變化，將畫面狀態反序列化寫回 JSON (也就是 `tab.content`)，觸發 `onContentChange`。任何 Node Config 或是 Disable 狀態都在這邊轉換回 JSON。
- **畫布操作 (Canvas Interaction)**: 預設停用左鍵框選 (Marquee Selection) 行為 (`selectionOnDrag={false}`)，保持簡樸與直覺的元素拖拉體驗。
- **右鍵行為**: 畫布與節點的右鍵選單已移除，右鍵純粹用於平移畫布。僅保留邊 (Edge) 的右鍵選單用於刪除連線。
- **執行與狀態同步**: 當收到後端 `workflow-step` (Wails Event) 時，更新畫面上的 Node Status。

## 5. 變更規範 (Contribution Rule)
1. **避免過度渲染**: Workflow 畫布元件非常龐大，請小心 `useEffect` 的相依陣列，避免引發無限 re-render。
2. **Handle 對齊**: 如果需更改節點外觀寬高，必須注意 Handles 的 `px` 與偏移量定位，確保線條接合完美。
