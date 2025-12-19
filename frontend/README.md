# OpenCV Custom - Frontend

基於 React + TypeScript + Vite 的現代化前端應用程式，用於控制 OpenCV 自動化腳本。

## 技術棧

- **框架**: React 18 + TypeScript
- **建置工具**: Vite
- **UI 框架**: DaisyUI + Tailwind CSS
- **圖示**: React Icons
- **國際化**: i18next + react-i18next

## 功能特色

### 1. Execution Tab（執行面板）
- **Script List Drawer**: 腳本清單側邊欄
  - 支援平台篩選（Robot / ADB）
  - 支援關鍵字搜尋
  - 可收合/展開
  - 雙擊開啟腳本
- **Script Tabs**: 多腳本分頁管理
  - 動態開啟/關閉腳本分頁
  - 執行狀態指示
- **Control Block**: 控制面板
  - 開始/停止執行按鈕
  - 動態參數設定（文字輸入、下拉選單、單選按鈕）
- **Log Block**: 執行日誌
  - 即時日誌顯示
  - 關鍵字搜尋
  - 等級標示（info/warn/error）
  - 自動滾動

### 2. Setting Tab（設定面板）
- **Theme Selector**: 主題切換
  - 支援 DaisyUI 全部 30+ 主題
  - 卡片式主題預覽
  - 持久化儲存
- **Locale Selector**: 語系切換
  - 繁體中文 / English
  - 即時切換
  - 持久化儲存

## 快速開始

### 安裝依賴

\`\`\`bash
npm install
\`\`\`

### 開發模式

\`\`\`bash
npm run dev
\`\`\`

預設會在 http://localhost:5173 啟動開發伺服器

### 建置

\`\`\`bash
npm run build
\`\`\`

建置結果會輸出到 `dist/` 目錄

### 預覽建置結果

\`\`\`bash
npm run preview
\`\`\`

## 專案結構

\`\`\`
frontend/
├── src/
│   ├── components/           # React 元件
│   │   ├── App.tsx
│   │   ├── ExecutionTab.tsx
│   │   ├── SettingTab.tsx
│   │   ├── ScriptListDrawer.tsx
│   │   ├── ScriptDetailTabs.tsx
│   │   ├── ScriptDetail.tsx
│   │   ├── ControlBlock.tsx
│   │   ├── LogBlock.tsx
│   │   ├── ThemeSelector.tsx
│   │   └── LocaleSelector.tsx
│   ├── i18n/                 # 國際化設定
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── zh-TW.json
│   │       └── en.json
│   ├── services/             # API 服務
│   │   └── mockService.ts
│   ├── types/                # TypeScript 型別定義
│   │   └── index.ts
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
\`\`\`

## Mock Service

目前使用 Mock Service 模擬後端 API，包含：

- `getAllScripts()`: 取得所有腳本清單
- `getScriptParameters()`: 取得腳本參數配置
- `startScript()`: 開始執行腳本
- `stopScript()`: 停止執行腳本

未來可替換為真實的 REST API 或 WebSocket 連線。

## 國際化

支援語系：
- `zh-TW`: 繁體中文
- `en`: English

翻譯檔案位於 `src/i18n/locales/`

## 主題

支援 DaisyUI 的所有主題，包括：
- light, dark, cupcake, bumblebee, emerald, corporate
- synthwave, retro, cyberpunk, valentine, halloween, garden
- forest, aqua, lofi, pastel, fantasy, wireframe, black
- luxury, dracula, cmyk, autumn, business, acid, lemonade
- night, coffee, winter, dim

## 響應式設計

使用 Tailwind CSS 實現完整的響應式設計：
- Mobile: 單欄布局
- Tablet: 雙欄布局
- Desktop: 完整多欄布局

