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
                    "delete": "Delete",
                    "save": "Save",
                    "cancel": "Cancel",
                    "upload": "Upload Script"
                },
                "setting": {
                    "title": "Setting",
                    "theme": "Theme",
                    "locale": "Locale",
                    "locale.zh": "Traditional Chinese",
                    "locale.en": "English"
                },
                "common": {
                    "loading": "Loading...",
                    "error": "Error occurred",
                    "success": "Operation successful"
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
                    "delete": "刪除",
                    "save": "儲存",
                    "cancel": "取消",
                    "upload": "上傳腳本"
                },
                "setting": {
                    "title": "設定",
                    "theme": "主題",
                    "locale": "語系",
                    "locale.zh": "繁體中文",
                    "locale.en": "英文"
                },
                "common": {
                    "loading": "載入中...",
                    "error": "發生錯誤",
                    "success": "操作成功"
                }
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "zh", // Default to Traditional Chinese
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
