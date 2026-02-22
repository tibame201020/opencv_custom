# 專案當前狀態與架構白皮書 (Project Actual State)

**更新日期**: 2026-02-22  
**當前分支**: `feature/virtual-workflow`

## 1. 專案核心目標
此專案 (`opencv_custom`) 的當前主要發展方向為**建立一套自動化工作流引擎 (Workflow Engine)**，並配備類似 n8n 的視覺化節點編輯器。
系統允許使用者透過拖拉節點 (React Flow) 來定義自動化流程，交由 Go 伺服器進行編排 (Orchestration)，最後透過 Python 子行程執行具體的自動化操作 (例如：ADB 點擊、圖像識別、鍵盤滑鼠操作)。

## 2. 系統架構與技術棧

專案採用 **Go (後端編排) + React (前端編輯器) + Python (底層執行)** 的三層式混合架構：

### 2.1 視覺化前端 (React)
- **目錄路徑**: `frontend/src/`
- **主要技術**: React, TypeScript, Vite, `@xyflow/react` (React Flow), Zustand, Tailwind CSS / DaisyUI.
- **現狀**: 
  - 已經實作了 V2 版本的 UI (類似 n8n 的方形節點、外部標籤、懸浮工具列)。
  - 支援拖曳連線、屬性面板 (`ParamField`)、全域變數設定 (`Set Variables` 支援 Expression Mode `{{ ... }}`)。
  - 整合了專案資源管理器 (Asset Manager)，支援圖片的即時預覽與拖放上傳。

### 2.2 後端與引擎 (Go)
- **目錄路徑**: `server/` (主要進入點在 `main.go` 與 `app.go`)。
- **主要技術**: Go, Gin (API Server), SQLite (資料庫), Wails (桌面化整合)。
- **現狀**:
  - 實作了基於圖論 (DAG) 的 Workflow Engine (`server/workflow/engine.go`)。
  - 管理全域 Context、節點之間的資料傳遞 (ExecutionData) 以及 Signal 流程控制 (Success/Error 等)。
  - 負責透過 JSON-RPC over stdin/stdout 喚起並管理 Python 子行程 (`server/workflow/executor.go`)。
  - 暴露 REST API 供前端呼叫 (例如 `/api/workflows/:id/run`, 資源管理 API)。

### 2.3 底層自動化執行 (Python)
- **目錄路徑**: `core/` (主要通訊橋樑 `core/workflow_bridge.py`)。
- **主要技術**: Python 3, OpenCV (影像辨識), uiautomator/adb (Android), pyautogui (Desktop)。
- **現狀**:
  - `workflow_bridge.py` 是一個常駐執行的 JSON-RPC 伺服器，負責接收 Go 傳來的動作指令 (`click`, `swipe`, `find_image` 等)。
  - 實例化抽象的 `PlatformService` (ADB 分支與 Robot 分支)。
  - 針對 Headless 與 CI 環境加入了各種穩健性測試 (Robustness) 與假資料注入 (`adb_stub`)。

---

## 3. 當前分支 (`feature/virtual-workflow`) 進度

根據 `CHANGELOG.md` 與 `TODO.md`，目前團隊重點在於「**工作流的 End-to-End (E2E) 驗證與邊界處理**」：

1. **已完成**:
   - 核心 Workflow 引擎的所有主要節點與流控 (WhileLoop, ForLoop, CaseWhen 等)。
   - **Go-Python-ADB-OpenCV 橋接器全線貫通**：已驗證從 Go 引擎透過橋接器喚起 Python 執行 ADB 點擊與 OpenCV 影像匹配。
   - **解決關鍵技術債**：修正了橋接器 stdout 汙染問題、Windows cp950 編碼崩潰以及專案路徑解析偏差。
   - 專案資源管理 (Assets CRUD)、圖片預覽機制。
   - V2 版的 UI 重構 (節點外觀、連線行為完美還原 n8n)。

2. **目前/接下來的挑戰**:
   - 工作流節點在 Frontend 與 Backend 的資料結構完全同步 (例如：前端將 workflow 轉換為 backend 需要的格式)。
   - 模擬器 (Browser / ADB) 執行時的環境依賴匹配 (例如：`find_image` 找不到特定圖示時的錯誤處理)。
   - 後續的功能規劃：版本控制、匯出/匯入 (JSON)、執行結果可視化回饋以及佈局對齊 (Snap-to-Grid) 等。

## 4. 目錄導覽捷徑 (Quick Navigation)

- **前端節點開發**: `frontend/src/components/workflow/nodes/`
- **前端狀態管理**: `frontend/src/store/workflowStore.ts`
- **Go 引擎層**: `server/workflow/engine.go`
- **Go-Python 橋樑**: `server/workflow/executor.go`
- **Python 橋樑**: `core/workflow_bridge.py`
- **ADB 具體操作**: `core/service/platform/adb/adb_platform.py`
