# Project: Script Platform 重構與開發計畫

## 目的
將現有 Java core-executor 重構為以 Python 為核心的執行器（Executor），並以 Go (Gin) 做 API 閘道、React + Tailwind + DaisyUI 做 GUI。允許上傳 trigger script 並即時監控執行日誌；採用檔案系統儲存範本與腳本；暫不實作身分驗證與使用者管理。

## 已確認設計決策（關鍵）
- Executor 框架：FastAPI（Python）
- Sandbox 策略：暫採受限 `subprocess` 執行（需抽象化，未來可切換為 Docker container）
- images/ 與範本檔：保留在 repo 內（`images/`）
- 身分驗證：暫不做
- Executor 與實體 device：必須在同台機器

## 里程碑
M1 — PoC 與最小可行原型
- 設計 `script SDK` 與 `DeviceInterface`
- 建置 Python Executor（FastAPI）支援 `POST /internal/run`、`GET /internal/run/{id}/status`、`POST /internal/run/{id}/stop`
- 建置 Go (Gin) 最小 API：上傳 script（filesystem）、啟動 run（proxy 到 Executor）、取得 run 狀態與 WebSocket 日誌
- 建置 React skeleton（Vite）含 Tailwind + DaisyUI，能上傳 script、啟動並查看即時 log

M2 — 功能完整化
- 支援 template image 的比對邏輯（移轉現有 `images/` 模板）
- 實作 run 控制（stop）、log stream（WebSocket）
- 抽象化 DeviceAdapter：`AdbDeviceAdapter`, `WinDeviceAdapter`（接口相同）
- 增加資源/時間限制與日誌保存

M3 — 測試、部署、硬化
- 完整 unit/integration tests、CI
- 可選 Docker Compose 部署（dev）
- 加入安全 sandbox（未來改為 container）

## 詳細任務清單

1) core-executor 改成 Python wrapper（FastAPI）
- 設計 `script SDK`（供使用者腳本 import 或由 Executor 注入 `ctx`）
  - `ctx.device`（`DeviceInterface`）、`ctx.opencv`（cv helpers）、`ctx.logger`、`ctx.params`
- `DeviceInterface` 必須包含：
  - `screenshot() -> bytes`
  - `tap(x,y)`
  - `double_tap(x,y)`
  - `long_press(x,y,duration_ms)`
  - `drag(x1,y1,x2,y2,duration_ms)`
  - `shell(cmd)`（選用，受限）
- 實作 adapter：
  - `AdbDeviceAdapter`：使用 `adbutils` 或 `subprocess` 呼叫 `adb` binary（推薦先用 `subprocess`）
  - `WinDeviceAdapter`：`pywin32` / `pyautogui`（僅於 Windows 執行）
- OpenCV 整合：
  - 使用 `opencv-python` + `numpy`
  - 提供 helper：`find_template`, `match_threshold`, `crop`, `ocr_integration_point`
- 執行流程（Executor）：
  - 接收 `POST /internal/run`（payload：script path 或 raw content、params）
  - 建立 Run Metadata（在 disk），創建 `subprocess` 執行腳本
  - Stdout/StdErr 透過 WebSocket 或 HTTP stream 即時傳給 Go server（或保持 Executor 的 websocket endpoint 供 Go proxy）
  - 支援 stop：透過 PID 終止或 send signal
- Sandbox 抽象化：
  - 設計 adapter 層，使未來以 `docker run` 替換時，不改變上層 API
  - 確保 stdout/stderr 與 exit code 能即時串流

2) golang gin server（無 DB，使用 disk filesystem）
- API 設計（精簡）：
  - `POST /api/scripts` — 上傳 script（multipart） -> 存 `scripts/{id}.py` + metadata JSON
  - `GET /api/scripts` — 列表（讀 filesystem）
  - `POST /api/runs` — 啟動（body: `{ "script_id": "...", "params": {...} }`） -> 轉發至 Executor `/internal/run`；回傳 `run_id`
  - `GET /api/runs/{run_id}` — 查狀態（從 Executor 查或讀本地 run metadata）
  - `GET /api/runs/{run_id}/ws` — WebSocket 連線以接收即時 log（Go 作為 proxy 或直接幫 client 跳轉到 Executor）
  - `POST /api/runs/{run_id}/stop` — 停止
- 儲存：
  - `scripts/` 目錄存腳本檔
  - `runs/` 目錄存 run metadata、log 檔
- 連線模型：
  - Go server 與 Executor 皆在同機，Go 透過 HTTP 呼叫 Executor endpoints；Executor 開 WebSocket to Go 或 Go 開 WebSocket to Executor（選一實作）

3) React GUI（Vite + React + Tailwind + DaisyUI）
- requirement: ui-requirement.md
- layout: ui-layout.md
- 串接：
  - REST for scripts/runs，WebSocket for logs

## 日誌/監控與存取
- Executor 將 stdout/stderr 寫入 `runs/{run_id}/stdout.log` 与 `stderr.log`，同時 stream 至 websocket
- Go server 代理或轉發 websocket，前端只連 Go 的 ws endpoint

## 測試策略
- Unit: device adapter、opencv helper
- Integration: Go -> Executor -> run sample script -> verify logs and stop
- E2E: 前端操作（上傳 -> run -> 查看 log）

## 交付物與範例
- `refactor/python-executor/` minimal FastAPI app + sample script (`scripts/sample.py`)
- `refactor/go-server/` minimal Gin app（routes as above）
- `refactor/web-ui/` Vite React skeleton（Tailwind + DaisyUI）
- `doc/refactor.md`（本檔）

## 風險與注意事項
- `subprocess` 模式需嚴格限制 runtime 與資源，避免惡意/無窮迴圈腳本佔用系統資源
- Windows-specific 功能需在 Windows 環境測試
- ADB 在 container 或非 root 執行時，device 權限需額外配置