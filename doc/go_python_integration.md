# Go ↔ Python Integration

This document outlines the architecture, protocol, and lifecycle of the communication between the Go backend (Workflow Executor) and the Python bridge (`workflow_bridge.py`).

## Dependencies

*   **Python 3.x**
*   **OpenCV**: `opencv-python` or `opencv-python-headless` (for headless environments).
    *   Note: In CI/CD or headless environments, ensure `opencv-python-headless` is installed to avoid `libGL.so` errors.
*   **ADB**: Android Debug Bridge (optional, for Android automation). Tests use `tools/adb_stub`.

## Architecture

The system uses a hybrid architecture:
*   **Go Backend**: Orchestrates the workflow, manages state, and handles concurrency.
*   **Python Bridge**: Executes platform-specific automation tasks (ADB, Desktop automation, Image Recognition) via a persistent subprocess.

Communication happens over **Standard I/O (stdin/stdout)** using JSON Lines.

## Lifecycle

1.  **Spawn**:
    *   Go calls `workflow.NewPythonBridge`.
    *   Executes `python -u core/workflow_bridge.py`.
    *   **Env Vars**: `ADB_BIN` (optional) can be injected for testing.

2.  **Ready Handshake**:
    *   Python starts and prints `{"signal": "ready", "output": {"version": "1.0"}}`.
    *   Go waits for this signal before proceeding.

3.  **Initialization**:
    *   Go sends `{"action": "init", "params": {"platform": "android", "device_id": "..."}}`.
    *   Python imports the appropriate service (AdbPlatform/RobotPlatform) and initializes it.
    *   Python responds with `{"signal": "success", "output": {...}}` or `{"signal": "error", "error": "..."}`.

4.  **Request/Response Loop**:
    *   Go sends a request: `{"action": "<action_name>", "params": { ... }}`.
    *   Python executes the action (blocking).
    *   Python responds: `{"signal": "success", "output": { ... }}`.
    *   **Logging**: Python writes logs to `stderr`, which Go captures and forwards to the user interface/logs.

5.  **Shutdown**:
    *   Go sends `{"action": "shutdown"}`.
    *   Python responds with `{"signal": "success"}` and exits.
    *   Go kills the process if it doesn't exit gracefully.

## JSON Protocol

### Request (Go → Python)
```json
{
  "action": "click_image",
  "params": {
    "image": "templates/ok_button.png",
    "threshold": 0.9,
    "timeout": 5000
  }
}
```

### Response (Python → Go)
**Success:**
```json
{
  "signal": "success",
  "output": {
    "clicked": true,
    "x": 100,
    "y": 200
  }
}
```

**Error:**
```json
{
  "signal": "error",
  "error": "Image not found"
}
```

## React → Go Entry Points

The frontend triggers workflows via the HTTP API:

*   **Endpoint**: `POST /api/workflows/:id/run`
*   **Handler**: `server/backend/server.go:runWorkflow`
*   **Flow**:
    1.  Frontend calls API.
    2.  `runWorkflow` retrieves the workflow definition.
    3.  `manager.StartWorkflow` creates a virtual process record.
    4.  A goroutine is spawned to execute the workflow.
    5.  If nodes require automation (e.g., `click_image`), `workflow.NewPythonBridge` is called.
    6.  Commands are sent to Python via stdin.
    7.  Logs and status updates are pushed to a WebSocket channel.

## Risks & Mitigation

1.  **Protocol Drift**:
    *   *Risk*: Go struct definitions mismatch Python dict keys.
    *   *Mitigation*: Integration tests (`server/workflow/bridge_integration_test.go`) ensure contract validity.

2.  **Bridge Crash**:
    *   *Risk*: Python process dies unexpectedly (OOM, syntax error).
    *   *Mitigation*: Go detects `stdout` closure and returns an error. The workflow engine handles this as a step failure.

3.  **Zombies**:
    *   *Risk*: Python processes remaining after Go exits.
    *   *Mitigation*: `server.Cleanup()` kills the bridge on shutdown. `cmd.Wait()` ensures resource release.

4.  **Concurrency**:
    *   *Risk*: Multiple nodes trying to use the bridge simultaneously.
    *   *Mitigation*: `PythonBridge` uses a `sync.Mutex` to serialize access to stdin/stdout.
