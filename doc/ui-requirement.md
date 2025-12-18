# GUI Layout 規範 - Script Platform (Detailed)

## 摘要與目標
- 提供清晰的 UI 規範，便於前端實作與跨團隊協作。
- 可用性重點：鍵盤導覽、可搜尋的日誌過濾、即時日誌串流。
- 設計可擴充，預留 Sandbox/容器化轉換點。

## 架構與分工
- 前端：React + Tailwind CSS + DaisyUI
- 後端/執行端：Python FastAPI（Execution） 與 Go Gin（Gateway）協作
- i18n： zh-TW 與 en，字串以鍵值管理
- UI 組件：MainTabs（Execution、Management、Setting）、Execution 子 Tabs（Detail、Logs）、Drawer、Tooltip

## 元件命名與結構
- MainTabs: Execution、Management、Setting
- Execution: Script List Drawer、Script Detail（Detail、Logs）
- Script Item：雙擊打開 Script Tab，Tab 可關閉
- Script Detail Tabs：Control Block、Log Block
- Theme/Locale：ThemeSwitch、LocaleSelector

## 版面與響應式
- 大螢幕：Drawer 固定寬度，右側內容自適應
- 小螢幕：Drawer 可折疊，內容自動堆疊
- Accessibility：ARIA、聚焦、可操作性

## 功能細節
- Execution
  - Script List Drawer：搜尋、過濾、展開詳情
  - Script Detail：Control Block、Log Block；日誌過濾與高亮；日誌可下載
- Management
  - CRUD：建立、編輯、刪除、上傳/匯入
- Setting
  - Theme、Locale（zh-TW/en），即時切換
  - 未來可擴充 DaisyUI 參數

## i18n
- locale 檔案：locales/zh-TW.json、locales/en.json
- 範例鍵值：
  - ui.execution.title: "Execution"
  - ui.execution.scriptList: "Script List"
  - ui.management.title: "Management"
  - ui.setting.title: "Setting"
  - ui.locale.zhTW: "繁體中文"
  - ui.locale.en: "English"

## 無障礙與測試
- ARIA、aria-label、鍵盤可聚焦
- 單元測試與整合測試覆蓋
- 日誌下載格式與一致性

## 實作建議
- Drawer 與 Tabs 的狀態管理要穩健
- i18n 字串要行距一致、語意清楚
- 測試覆盖日誌流、過濾、雙擊打開 Script Tab 等互動

