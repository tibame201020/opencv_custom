# 系統模式

## 架構概覽
```
前端 (React + TypeScript)
├── Components (UI 元件層)
├── Services (API 服務層)
├── Types (型別定義層)
└── i18n (國際化層)
```

## 核心設計模式

### 1. 狀態管理
- **Local State**：使用 React useState 管理元件狀態
- **Props Drilling**：父子元件間透過 props 傳遞資料和回呼函數
- **未來考慮**：若狀態複雜度增加，可引入 Context API 或 Zustand

### 2. 服務層設計
```typescript
// services/mockService.ts
export const scriptService = {
  getAllScripts: async () => Promise<Script[]>
  getScriptParameters: async (scriptId) => Promise<ScriptParameter[]>
  startScript: async (scriptId, parameters) => Promise<void>
  stopScript: async (scriptId) => Promise<void>
}
```

**未來替換為真實 API**：
- 保持相同介面簽名
- 替換實作為 fetch/axios 呼叫
- 加入錯誤處理和重試邏輯

### 3. 元件組織模式
```
ExecutionTab (容器元件)
├── ScriptListDrawer (展示元件)
│   └── 管理腳本清單、篩選、搜尋
├── ScriptDetailTabs (展示元件)
    └── ScriptDetail (容器元件)
        ├── ControlBlock (展示元件)
        └── LogBlock (展示元件)
```

### 4. 參數動態渲染
根據後端提供的參數類型動態渲染對應的輸入元件：
- `text` → `<input type="text">`
- `select` → `<select>` with options
- `radio` → `<input type="radio">` group

### 5. 主題和語系管理
- **主題**：localStorage 持久化，透過 `data-theme` attribute 切換
- **語系**：i18next 管理，localStorage 持久化，即時切換

## 關鍵技術決策

### Tabs 實作
使用 DaisyUI 的 tabs-lifted 樣式：
- 主 Tabs：Execution / Setting
- 子 Tabs（Execution）：Control / Log
- 腳本 Tabs：動態開啟/關閉多個腳本

### Drawer 實作
自訂 Drawer（非使用 DaisyUI Drawer 元件）：
- 使用 Tailwind transition 實現動畫
- 寬度切換：80 (展開) / 0 (收合)
- 提供切換按鈕

### RWD 策略
使用 Tailwind 響應式 class：
- Mobile first 設計
- Breakpoints: sm / md / lg / xl
- Grid 佈局自動調整欄數

