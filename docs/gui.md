使用 vite
框架 react
ui daisyUI
排版或css tailwind
icon react-icon
---
gui

==

樣式參考
https://jeff-hsu024.github.io/self_recorder-frontend/dashboard/diet
或是repo
https://github.com/Jeff-Hsu024/self_recorder-frontend

但以下面要求為主 樣式是參考 但layout以下面定義

## 基本layout
daisyUI tabs: https://daisyui.com/components/tab/
使用 tabs-lift
有兩個tab [Execution, Setting]

+---------------------------------------+
| [Execution] [Setting]    |
+---------------------------------------+
| 內容區塊： flex-grow 剩餘滿版
+---------------------------------------+

---

## Execution Layout
左側 script list, 需要有filter可以快速過濾
右側子tabs 也使用 tabs-lift 但size為small 需要可打開script tabt tab
Control Block, Log Block用fieldset分組切開
https://daisyui.com/components/fieldset/

+---------------------------------------+
| [Execution]    |
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
+---------------------------------------+
---

## Setting layout

兩個fieldset
theme: https://daisyui.com/docs/themes/
語系切換

+---------------------------------------+
| [Setting]    |
+---------------------------------------+
| 內容區塊：Setting
| - daisyUI Theme 切換
| - Locale zh-TW / en
| - 即時語系切換
+---------------------------------------+

---
## 其餘requirement
需要的是現代化ui 故也需要icon rwd
rwd用tailwind 實現
icon: https://react-icons.github.io/react-icons/

考量到整體設計 應該layout設計完 先實現Setting 會比較好

### tabs用法
```jsx
{/* name of each tab group should be unique */}
<div className="tabs tabs-lift">
  <label className="tab">
    <input type="radio" name="my_tabs_4" />
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
    Live
  </label>
  <div className="tab-content bg-base-100 border-base-300 p-6">Tab content 1</div>

  <label className="tab">
    <input type="radio" name="my_tabs_4" defaultChecked />
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
    Laugh
  </label>
  <div className="tab-content bg-base-100 border-base-300 p-6">Tab content 2</div>

  <label className="tab">
    <input type="radio" name="my_tabs_4" />
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
    Love
  </label>
  <div className="tab-content bg-base-100 border-base-300 p-6">Tab content 3</div>
</div>
```