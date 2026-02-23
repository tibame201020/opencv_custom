# Workflow 與 Node 使用手冊

本手冊詳細說明如何使用此工作流引擎，特別是關於**變數管理**、**表達式語法**以及**各節點功能**。

---

## 核心觀念：資料流 (Data Stream)

本引擎採用類似 n8n 的資料流設計：
- 每個節點執行的輸出是一組 **ExecutionItems** (列表)。
- 每個 Item 包含 `json` (資料內容) 與 `binary` (圖片/檔案)。
- 節點會將輸出的 Item 傳遞給後續連接的節點。

---

## 表達式語法與變數取用

要在節點設定中動態引用變數，請使用 `{{ ... }}` 語法。本引擎支援**遞迴解析**，代表您可以在嵌套的物件或列表中使用表達式。

### 1. 取用當前 Item 的資料 (`$json`)
如果你希望取得上一個節點直接傳過來的資料：
- 語法：`{{ $json.key }}`
- 範例：`{{ $json.similarity }}` (取得視覺偵測的相似度)。

### 2. 取用特定節點的資料 (`$node`)
如果你希望取得流程中**更早之前**某個節點的結果：
- 語法：`{{ $node["節點名稱"].json.key }}`
- 範例：`{{ $node["Set Variable"].json.my_var }}`
- **注意**：如果該節點有多個輸出 Item，目前預設會取用第一個 Item。

### 3. 取用全域變數 (`$vars`)
目前全域變數主要用於引擎內部狀態：
- 範例：`{{ $vars.loop_<ID>_index }}` (迴圈目前的索引)。
- **注意**：目前尚未落實「使用者自定義全域變數節點」。

---

## 常用節點說明

### 📌 設置變數 (Set Variable)
用於在資料流中插入新資料。
- **如何使用**：在 參數分頁 中使用 **Add Variable** 按鈕新增 Key-Value 對。
- **資料儲存**：它會將變數**打平 (Flatten)** 儲存於當前 Item 的 `json` 物件中。
- **取出使用**：
  - 如果是「緊接在後的節點」：直接使用 `{{ $json.你的變數名 }}` (不再需要經由 `.variables` 嵌套)。
  - 如果是「隔了好幾個節點後」：使用 `{{ $node["Set Variable 節點名稱"].json.你的變數名 }}`。

### 📌 邏輯判斷 (IF Condition)
根據條件將資料流拆分到 `true` 或 `false` 兩個分支。
- **支援運算**：`equals`, `gt`, `lt`, `contains`, `startsWith` 等。

### 📌 迴圈 (Loop)
對一組列表進行迭代執行。
- **屬性**：
  - `body` 分支：每輪迭代輸出的 Item。
  - `done` 分支：迴圈結束後觸發。

### 📌 影像自動化節點 (Vision Actions)
- **Click Image / Find Image**：執行後會輸出 `found` (true/false) 與 `similarity`。
- **注意**：這類動作節點通常會**覆蓋**掉目前 Item 的 `json` 內容。因此，若要取用之前的 `Set Variable` 變數，建議使用 `$node["名稱"]` 語法。

### 📌 Python 程式碼 (Code)
執行自定義 Python 腳本。
- **輸入**：腳本內可透過 `input` 取得傳入的 Item。
- **輸出**：回傳的字典或物件會被包裝成新的 ExecutionItem。

---

## 目前尚未實作 (照實寫)

1. **複雜 JavaScript 表達式**：目前 `{{ }}` 內僅支援路徑取值（如 `$json.a.b`），不支援運算（如 `{{ $json.a + 1 }}`）。
2. **多重輸出分支取值**：目前 `$node` 語法預設取用 `success` 分支的第一筆資料。
3. **子工作流 (Sub-workflow)**：目前僅有空殼實作，尚未能真正執行另一個 .json。

---

## 實戰範例：存取變數

1. 建立節點 `Set Variable`，名稱設為 "InitVars"，設定欄位 `target_user = "admin"`。
2. 建立節點 `Log`，設定 Message 為 `Hello {{ $json.target_user }}!`。
3. 如果中間經過了一個 `Click Image` 節點，則 `Log` 需改為 `Current user: {{ $node["InitVars"].json.target_user }}`。
