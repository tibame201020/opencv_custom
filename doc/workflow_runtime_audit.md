# Workflow Runtime Audit

## 1. Data Flow

The workflow runtime validation targets the following complete chain:

```mermaid
graph TD
    React[React Frontend] -->|HTTP POST /api/workflows/:id/run| GoAPI[Go Backend API]
    GoAPI -->|Execute| Engine[Workflow Engine (Go)]
    Engine -->|Persist State| SQLite[(SQLite DB)]
    Engine -->|Spawn/Manage| Bridge[core/workflow_bridge.py]

    subgraph Python Runtime
        Bridge -->|JSON-RPC (stdin/stdout)| BridgeLoop[Bridge Event Loop]
        BridgeLoop -->|Call| Platform[PlatformService (AdbPlatform)]
        Platform -->|Uses| OpenCV[OpenCvService]
        Platform -->|Uses| ADB_Wrapper[core/service/platform/adb/adb.py]
    end

    ADB_Wrapper -->|Subprocess| ADB_Bin[ADB Executable]
    ADB_Bin -->|USB/TCP| Device[Android Device]
```

### Key Components

1.  **React Frontend**: Initiates execution via `/api/workflows/:id/run`.
2.  **Go Engine (`server/workflow`)**:
    *   Loads workflow definition from SQLite.
    *   Executes nodes.
    *   Persists execution results to SQLite.
    *   For "Platform Nodes" (Click, Swipe, Screenshot), constructs a JSON request.
3.  **Python Bridge (`core/workflow_bridge.py`)**:
    *   Long-running subprocess spawned by `server/workflow/executor.go`.
    *   Listens on `stdin`, replies on `stdout`.
4.  **Python Services**:
    *   **AdbPlatform** (`core/service/platform/adb/adb_platform.py`): Handles high-level logic (e.g., `click`, `swipe`).
    *   **OpenCvService** (`core/service/core/opencv/open_cv_service.py`): Image matching/OCR.
    *   **Adb** (`core/service/platform/adb/adb.py`): Wraps `adb` CLI calls.

## 2. Workflow Runtime vs. Python Script Runtime

| Feature | Python Script Runtime (`run_script.py`) | Workflow Runtime (`workflow_bridge.py`) |
| :--- | :--- | :--- |
| **Control Flow** | Linear or script-defined (Python loops/ifs). | Managed by Go Engine (DAG). |
| **Execution Model** | Single process execution of a user script. | Long-running RPC server processing discrete actions. |
| **Context** | `platform` and `opencv` injected into `globals()`. | `platform` and `opencv` held as global variables in `bridge.py`. |
| **Persistence** | Script runs to completion and exits. | Bridge stays alive for the duration of the workflow session. |
| **Data Passing** | Python variables. | JSON-RPC params and results. |
| **Logging** | Direct stdout/stderr. | stdout is reserved for RPC; stderr used for logs. |

## 3. Service Call Paths

The Workflow Runtime maps specific JSON-RPC actions to Python functions:

| Action (JSON-RPC) | Python Function Call | File |
| :--- | :--- | :--- |
| `init` | `handle_init(params)` -> `Adb(device_id)` | `core/workflow_bridge.py` |
| `click` | `platform.click(x, y)` | `core/service/platform/adb/adb_platform.py` |
| `swipe` | `platform.swipe(x1, y1, x2, y2, duration)` | `core/service/platform/adb/adb_platform.py` |
| `screenshot` | `platform.snapshot()` -> `adb.get_snapshot()` | `core/service/platform/adb/adb.py` |
| `find_image` | `platform.find_image(template, ...)` | `core/service/platform/adb/adb_platform.py` |
| `click_image` | `platform.click_image(template, ...)` | `core/service/platform/adb/adb_platform.py` |
| `type_text` | `platform.type_text(text)` | `core/service/platform/adb/adb_platform.py` |

## 4. Potential Risks

1.  **Implicit Coupling**: The action names in Go (`click`, `swipe`, `find_image`) must strictly match the `handle_action` dispatch logic in `workflow_bridge.py`. There is no shared contract (like Protobuf/Thrift), making it brittle.
2.  **RPC Overhead**: Every node execution involves JSON serialization, IPC transfer, and deserialization. High-frequency loops (e.g., waiting for an image 100 times per second) might introduce significant latency compared to native Python loops.
3.  **Process Lifecycle**: If `workflow_bridge.py` crashes, the Go engine must detect it and fail the workflow. State recovery (re-connecting ADB) is not automatic in the current design.
4.  **Environment Consistency**: The bridge relies on the same Python environment as the script runner. Missing dependencies will break both.
5.  **Concurrency**: The bridge is single-threaded. Parallel execution branches in the Go workflow engine converging on the same bridge instance must be serialized by the Go side (Mutex in `executor.go` handles this, but it limits throughput).
