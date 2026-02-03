import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
    en: {
        translation: {
            "ui": {
                "execution": {
                    "title": "Execution",
                    "scriptList": "Script List",
                    "searchData": "Search Script...",
                    "noScripts": "No scripts found",
                    "start": "Run",
                    "stop": "Stop",
                    "params": "Parameters",
                    "console": "Console Output",
                    "status": "Status"
                },
                "management": {
                    "title": "Management",
                    "create": "Create Script",
                    "edit": "Edit",
                    "rename": "Rename",
                    "delete": "Delete",
                    "save": "Save",
                    "cancel": "Cancel",
                    "upload": "Upload Script (ZIP)",
                    "export": "Export ZIP",
                    "search": "Search Script...",
                    "systemScript": "System Script",
                    "renameScript": "Rename Script",
                    "scriptName": "Script Name",
                    "platform": "Platform",
                    "platformDesktop": "Desktop (Windows/Linux)",
                    "platformAndroid": "Android (ADB)",
                    "renameHelp": "Only alphanumeric and underscores allowed.",
                    "confirm": "Confirm",
                    "confirmDelete": "Confirm Deletion",
                    "deleteWarning": "Are you sure you want to delete the script",
                    "deleteWarningDetail": "This action cannot be undone and all associated images will be removed.",
                    "deletePermanently": "Delete Permanently",
                    "nameConflict": "Name Conflict",
                    "importConflictText": "A script with the name already exists. Please provide a different name to import this script.",
                    "renameTo": "Rename to...",
                    "importAsNew": "Import as New",
                    "duplicateError": "A script with this name already exists."
                },
                "setting": {
                    "title": "Setting",
                    "theme": "Theme",
                    "locale": "Locale",
                    "locale.zh": "Traditional Chinese",
                    "locale.en": "English"
                },
                "editor": {
                    "title": "Editor",
                    "files": "Explorer",
                    "assets": "Assets",
                    "save": "Save",
                    "device": "Device",
                    "selectDevice": "Select Device (ADB)",
                    "screenshot": "Screenshot",
                    "confirmDelete": "Delete Asset?",
                    "deleteWarning": "Are you sure you want to delete this asset?"
                },
                "debug": {
                    "title": "System Debugger",
                    "subtitle": "ADB Server & Terminal",
                    "daemonActive": "Daemon Active",
                    "daemonStopped": "Daemon Stopped",
                    "statusUnknown": "Status Unknown",
                    "startServer": "Start Server",
                    "stopServer": "Stop Server",
                    "terminalTitle": "adb-shell — 80x24",
                    "welcome": "Welcome to ADB Debug Terminal.\nType 'devices', 'kill-server', or any ADB command.",
                    "placeholder": "Type command here... (e.g. devices -l)"
                },
                "common": {
                    "loading": "Loading...",
                    "error": "Error occurred",
                    "success": "Operation successful",
                    "menu": "Menu",
                    "appTitle": "Platform"
                }
            }
        }
    },
    zh: {
        translation: {
            "ui": {
                "execution": {
                    "title": "執行",
                    "scriptList": "腳本清單",
                    "searchData": "搜尋腳本...",
                    "noScripts": "找不到腳本",
                    "start": "執行",
                    "stop": "停止",
                    "params": "參數設定",
                    "console": "終端機輸出",
                    "status": "狀態"
                },
                "management": {
                    "title": "管理",
                    "create": "新增腳本",
                    "edit": "編輯",
                    "rename": "重新命名",
                    "delete": "刪除",
                    "save": "儲存",
                    "cancel": "取消",
                    "upload": "上傳腳本 (ZIP)",
                    "export": "匯出 ZIP",
                    "search": "搜尋腳本...",
                    "systemScript": "系統內建",
                    "renameScript": "重新命名腳本",
                    "scriptName": "腳本名稱",
                    "platform": "執行平台",
                    "platformDesktop": "桌面端 (Windows/Linux)",
                    "platformAndroid": "Android 端 (ADB)",
                    "renameHelp": "僅允許英數字與底線。",
                    "confirm": "確認",
                    "confirmDelete": "刪除確認",
                    "deleteWarning": "您確定要刪除腳本",
                    "deleteWarningDetail": "此操作無法還原，且所有相關圖片資產都將被移除。",
                    "deletePermanently": "永久刪除",
                    "nameConflict": "名稱衝突",
                    "importConflictText": "已存在同名腳本。請提供一個不同的名稱以完成匯入。",
                    "renameTo": "重新命名為...",
                    "importAsNew": "作為新腳本匯入",
                    "duplicateError": "該名稱已存在。"
                },
                "setting": {
                    "title": "設定",
                    "theme": "主題",
                    "locale": "語系",
                    "locale.zh": "繁體中文",
                    "locale.en": "英文"
                },
                "editor": {
                    "title": "編輯器",
                    "files": "檔案總管",
                    "assets": "圖片資產",
                    "save": "儲存",
                    "device": "裝置",
                    "selectDevice": "選擇裝置 (ADB)",
                    "screenshot": "截圖",
                    "confirmDelete": "刪除圖片?",
                    "deleteWarning": "確定要永久刪除此圖片嗎?"
                },
                "debug": {
                    "title": "系統調適",
                    "subtitle": "ADB 伺服器與終端機",
                    "daemonActive": "服務運行中",
                    "daemonStopped": "服務已停止",
                    "statusUnknown": "狀態未知",
                    "startServer": "啟動伺服器",
                    "stopServer": "停止伺服器",
                    "terminalTitle": "ADB 命令列介面",
                    "welcome": "歡迎使用 ADB 調適終端機。\n您可以輸入 'devices', 'kill-server' 或任何 ADB 指令。",
                    "placeholder": "請輸入指令... (例如 devices -l)"
                },
                "common": {
                    "loading": "載入中...",
                    "error": "發生錯誤",
                    "success": "操作成功",
                    "menu": "功能選單",
                    "appTitle": "自動化平台"
                }
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en", // Default to English
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
