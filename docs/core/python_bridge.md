# Python Bridge 整合與設計 (跨平台 RPC 通訊)

> **相關目錄**: `/core/workflow_bridge.py`, `/server/process_manager/`

本系統大量依賴 Python 處理外部設備控制（透過 ADB）以及影像辨識（透過 OpenCV）。Go Server 透過 JSON-RPC 的方式執行 Python Process，形成一套「橋接 (Bridge)」架構。

## 1. 架構概念
* **Go Server** 作為 Master，管理 Workflow 的狀態圖解析與變數替換。
* **Python Process** 作為 Worker，專職處理視覺辨識與硬體控制。Go 在需要執行相關節點時，將任務 `Dispatch` 給 Python。

## 2. 後端程序生命週期 (`process_manager`)
- Server 啟動時或 Workflow 執行前，會呼叫 `StartBridge()` 產出一個長時間掛載 (Long-running) 的 Python 子行程。
- 透過 `stdin` 與 `stdout` 使用 `jsonl` (JSON Lines) 格式通訊。
- 每個請求攜帶一個唯一 ID (`req_id`)，以支援非同步 Callback。
- 支援 Heartbeat (Ping/Pong) 機制偵測存活狀態。如果在測試中當掉，會將 Timeout 的 Process Kill 掉重啟。

## 3. Python 端的處理邏輯 (`workflow_bridge.py`)
- Python 的 Entrypoint 啟動一個 Infinite Loop，監聽 `sys.stdin.readline()`。
- 收到來自 Go 的 `execute` 指令後：
  1. 呼叫 `handle_execute(node_type, config, input_data)`。
  2. 根據 `node_type` 判斷對應動作 (e.g., `find_image`, `click_image`, `adb_command`)。
  3. 執行 ADB 的底層腳本或 `cv2` Matching。
  4. 捕捉所有 Exception，包裝為統整好的 JSON 回傳 `sys.stdout.write()` 並 `sys.stdout.flush()`。

## 4. ADB 設備連線
- 本機端預設不打包 adb.exe，而是依賴環境變數中的 ADB 路徑，或透過 Go Server 傳遞過去的初始化 API 注入 `ADB_BIN`。
- Python 內部使用自訂封裝的方法（如 `device.screencap()` 或 `device.sh("input tap X Y")`）來繞過某些函式庫可能存在的阻斷 Bug。

## 5. 變更規範 (Contribution Rule)
1. **Stdout Cleanliness**: **絕對不可以**在 Python 端直接 `print()` 任何非 JSON RPC 的字串！這會破壞 Go 的 JSON 序列化器導致整個系統崩潰。需要打 Log 請改寫為往 `sys.stderr` 輸出。
2. **路徑安全**: 從 Go 傳過來的檔案路徑（Asset 圖片），通常是專案根目錄或是伺服器端的絕對目錄，請確保 Python `is_absolute` 確認路徑正確拼接，避免路徑入侵（Path Traversal）。
