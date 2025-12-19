# 技術情境

## 前端技術棧

### 核心框架
- **React** 18.3.1 - UI 框架
- **TypeScript** 5.6.2 - 型別安全
- **Vite** 5.4.10 - 建置工具

### UI 框架與樣式
- **DaisyUI** 4.12.14 - UI 元件庫
- **Tailwind CSS** 3.4.15 - CSS 框架
- **react-icons** 5.3.0 - 圖示庫

### 國際化
- **i18next** 23.16.4 - 國際化核心
- **react-i18next** 15.1.1 - React 整合

## 開發環境設定

### 專案初始化
```bash
cd frontend
npm install
npm run dev  # 啟動開發伺服器於 http://localhost:5173
```

### 建置指令
```bash
npm run build    # 建置生產版本至 dist/
npm run preview  # 預覽建置結果
npm run lint     # ESLint 檢查
```

### 開發伺服器
- Port: 5173
- Hot Module Replacement (HMR) 已啟用
- 自動重新載入

## 專案結構
```
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
│   ├── i18n/                 # 國際化
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── zh-TW.json
│   │       └── en.json
│   ├── services/             # API 服務
│   │   └── mockService.ts
│   ├── types/                # TypeScript 型別
│   │   └── index.ts
│   ├── main.tsx             # 應用程式入口
│   └── index.css            # 全域樣式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## 型別定義
```typescript
// types/index.ts
Platform: 'robot' | 'adb'
Script: { id, name, platform, description? }
ScriptParameter: { id, label, type, options?, defaultValue? }
ScriptConfig: { scriptId, parameters }
LogEntry: { id, timestamp, level, message }
OpenScriptTab: { scriptId, scriptName, isRunning }
```

## 設定檔案

### Vite 設定
- Plugin: @vitejs/plugin-react
- 預設配置，無額外客製化

### Tailwind 設定
- DaisyUI plugin 已啟用
- 支援 30+ 主題
- Content: `./src/**/*.{js,ts,jsx,tsx}`

### TypeScript 設定
- Target: ES2020
- JSX: react-jsx
- Strict mode: enabled
- Module resolution: bundler

## DaisyUI 主題列表
支援的 30 個主題：
- light, dark, cupcake, bumblebee, emerald
- corporate, synthwave, retro, cyberpunk, valentine
- halloween, garden, forest, aqua, lofi
- pastel, fantasy, wireframe, black, luxury
- dracula, cmyk, autumn, business, acid
- lemonade, night, coffee, winter, dim

## 注意事項
1. PowerShell 不支援 `&&` 運算符，需使用 `;` 或分開執行
2. 開發伺服器需在 `frontend/` 目錄執行
3. i18n 初始化在 `main.tsx` import，確保在 React 掛載前完成

