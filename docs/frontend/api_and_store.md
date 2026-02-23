# Zustand Store 與 Wails API Bind (Frontend Context)

> **相關目錄**: `/frontend/src/store.ts`, `/frontend/src/wailsjs/`

前端是基於 React + Vite 開發，結合 `wailsjs` 與後端 Go 進行雙向綁定 (Binding) 呼叫。在管理 React 的全域狀態上，專案統一採用 `Zustand` 框架作為唯一真相來源 `Single Source of Truth`。

## 1. 狀態管理 (`store.ts`)
Store 主要劃分為幾個核心區塊，包含 App 狀態、Project 狀態與 Workflow Tab 狀態：

### 第一部分: Global Application State
- **`device`** / **`deviceList`**: 管理目前 Android 設備連接狀態（ADB）。可調用 `loadDevices` 透過後端擷取設備清單清單。
- **`theme`**: UI 色彩主題 (基於 DaisyUI `data-theme`)。這會影響 Node Canvas 的預設配色。

### 第二部分: Project State
- **`projectId`** / **`projects`**: 目前選取的專案與專案清單。
- **`assets`**: 紀錄目前專案下的資料夾、圖檔、設定等靜態檔目錄。
- 觸發 `loadProjects()` 將使用 Wails 呼叫 `GetProjects()` 從 SQLite 同步狀態。

### 第三部分: Editor Tabs System
這是一個複雜的多頁籤編輯環境：
- **`tabs`**: 陣列形式。可包含的 Tag 類型有 `workflow`, `script` (Python 檔案), 甚至是圖片 Asset (顯示 `AssetViewer`)。
- **`activeTabId`**: 當前 Focus 在畫布區塊的 Tab。
- **`Dirty Marker` (`isDirty`)**: 在各 Editor（如 Monaco、React Flow）觸發 `onContentChange` 時：
  1. 將更動同步寫入 `tab.content`（JSON 或純文字）。
  2. 將 `isDirty` 標記為 True。直到按 Ctrl+S 調用 Wails API `SaveWorkflow(json)` 寫入後端後才會清除 True。

## 2. API 通訊層 (`wailsjs`)
Wails在 Go 編譯後，會自動在 `frontend/src/wailsjs/` 產生 TypeScript Stub：
1. **Request (Frontend -> Backend)**: 所有的通訊都是 `Promise`，可當作普通的 Fetch 使用，例如 `SaveWorkflow(jsonStr)`。
2. **Eventing (Backend -> Frontend)**: Go 端透過 `wails.EventsEmit` 發出事件 (例如 Workflow Step, Python Log)。
   - 在 React UI 中，常使用 `useEffect` 加上 `window.addEventListener('EventName')` 將這類廣播轉譯回 Component State（以 Workflow 節點亮燈等功能最為常見）。

## 3. 變更規範 (Contribution Rule)
1. **Action Payload**: 修改 `store.ts` 的 action 內容時，盡量提供純函式的方法或從傳入參數設定狀態，避免邏輯泥球。
2. **API 阻斷/逾時**: Wails API 在開發 (Dev Mode) 下如果 Go 當掉或是 Python Bridge 阻塞，前端呼叫會永久 Pending。若是涉及可能會卡住的調用，應在 Store action 端加入 `finally` 狀態或 Timeout 保護。
