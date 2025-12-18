# GUI Layout 規範 - Script Platform (Template)
---

+---------------------------------------+
| [Execution] [Management] [Setting]    |
+---------------------------------------+
| 內容區塊：Execution
| - Script List Drawer（左側，含 filter）
| - Script Detail（右側，子 Tabs）
|   - Tab 1: Control Block（Start/Stop 與參數）
|   - Tab 2: Log Block（實時日誌，支援 filter/highlight）
| - Script List Item：雙擊打開 Script Tab，Tab 可關閉
| - Drawer 可收合，預設展開，使用 Tailwind + DaisyUI
| - i18n 鍵值 ui.execution.*、ui.scriptList.*
| - Tooltip、搜尋、快速過濾
| 內容區塊：Management
| - Script CRUD（建立、讀取、更新、刪除）
| - 表單驗證、上傳與儲存
| - 與 Execution 的 API 接口契合
| - 版本控管與命名規範
| 內容區塊：Setting
| - Theme 切換（Light / Dark）
| - Locale zh-TW / en
| - 即時語系切換
| - 未來可擴充 DaisyUI 參數
+---------------------------------------+

---

# i18n 範例鍵值

locales/zh-TW.json
{
  "ui": {
    "execution": {
      "title": "執行",
      "scriptList": "腳本清單"
    },
    "management": {
      "title": "管理"
    },
    "setting": {
      "title": "設定",
      "theme": "主題",
      "locale": "語系",
      "locale.zhTW": "繁體中文",
      "locale.en": "英文"
    }
  }
}

locales/en.json
{
  "ui": {
    "execution": {
      "title": "Execution",
      "scriptList": "Script List"
    },
    "management": {
      "title": "Management"
    },
    "setting": {
      "title": "Setting",
      "theme": "Theme",
      "locale": "Locale",
      "locale.zhTW": "Traditional Chinese",
      "locale.en": "English"
    }
  }
}
