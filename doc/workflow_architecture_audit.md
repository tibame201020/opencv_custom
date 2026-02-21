# Workflow Architecture Audit Report

**Date:** 2025-02-24
**Scope:** Go backend, React frontend, Python services, Workflow engine, SQLite, Wails integration.

---

## 1. Global Architecture

The system follows a hybrid architecture combining a Go-based backend (orchestration) and a Python-based service layer (automation execution), connected via a JSON-RPC bridge.

### Architecture Diagram

```mermaid
graph TD
    User[User / React Frontend] -->|HTTP/WS| GoAPI[Go Backend API]
    GoAPI -->|Invoke| FlowEngine[Workflow Engine (Go)]

    subgraph "Go Runtime (Server)"
        GoAPI
        FlowEngine
        Executor[Bridge Executor]
        SQLite[(SQLite DB)]

        GoAPI -- CRUD --> SQLite
        FlowEngine -- Read/Write --> SQLite
        FlowEngine -- Execute Step --> Executor
    end

    subgraph "Python Runtime (Core)"
        Bridge[workflow_bridge.py]
        PlatformABC{PlatformService ABC}
        ADB[AdbPlatform]
        Robot[RobotPlatform]
        OpenCV[OpenCvService]

        Executor -- JSON-RPC (Stdin/Stdout) --> Bridge
        Bridge -- Dispatch --> PlatformABC
        PlatformABC <|-- ADB
        PlatformABC <|-- Robot
        PlatformABC -- Uses --> OpenCV
    end

    subgraph "Devices"
        Android[Android Device]
        Desktop[Desktop OS]
    end

    ADB -- adb shell --> Android
    Robot -- pyautogui --> Desktop
```

### Key Components & Entry Points

| Component | Path | Entry Point / Key File | Description |
|-----------|------|------------------------|-------------|
| **Frontend** | `frontend/src/` | `App.tsx`, `views/WorkflowEditorView.tsx` | React UI for editing and monitoring workflows. |
| **Go Backend** | `server/backend/` | `server.go` | Gin server handling API requests and Wails binding. |
| **Workflow Engine** | `server/workflow/` | `engine.go` | Core logic for executing the workflow graph (BFS traversal). |
| **Python Bridge** | `server/workflow/` | `executor.go` | Go-side manager for the Python subprocess (JSON-RPC). |
| **Bridge Script** | `core/` | `workflow_bridge.py` | Python-side JSON-RPC server reading stdin/writing stdout. |
| **Python Runtime** | `core/run_script.py` | `run_script.py` | Legacy/Direct entry point for running pure Python scripts. |
| **Platform Service** | `core/service/` | `platform/platform_service.py` | Abstract Base Class defining platform capabilities. |
| **Database** | `server/db/` | `db.go`, `workflow_db.go` | SQLite storage for workflows, nodes, and projects. |

---

## 2. Runtime Analysis

There are two distinct runtimes for executing automation tasks:

### A. Python Script Runtime (`core/run_script.py`)
*   **Flow**: User -> `run_script.py` -> `Script Class` (e.g., `RobotScript`) -> `PlatformService` (Direct Call).
*   **Characteristics**:
    *   Monolithic Python process.
    *   State is managed within Python variables.
    *   Direct method calls (low latency).
    *   Harder to visualize or edit dynamically.

### B. Workflow Runtime (`server/workflow/engine.go`)
*   **Flow**: User -> Go Engine -> `Executor` -> `JSON-RPC` -> `workflow_bridge.py` -> `PlatformService`.
*   **Characteristics**:
    *   Distributed (Go orchestrates, Python executes actions).
    *   **State**: Managed in Go (`GlobalContext`, `NodeResults`).
    *   **Latency**: Incurs IPC overhead (JSON serialization/deserialization over pipes).
    *   **Visual**: Graph-based execution with step-by-step tracking.

### Comparison

| Feature | Python Script Runtime | Workflow Runtime |
|---------|-----------------------|------------------|
| **Control Flow** | Python `if/for` | Go `FlowEngine` (Graph traversal) |
| **Data Passing** | Variables | `ExecutionData` (JSON List) |
| **Abstraction** | Direct Object Usage | JSON-RPC Messages |
| **Flexibility** | Code-based (High) | Node-based (Structured) |

---

## 3. Workflow Engine Design Analysis

### Node Model
*   **Definition**: `WorkflowNode` struct in `server/workflow/engine.go`.
*   **Input/Output**:
    *   **Input**: `NodeArg` containing `Input` (List of `ExecutionItem`) and `GlobalContext`.
    *   **Output**: `NodeOutput` map of `ExecutionData`.
*   **Data Structure**: Mimics n8n's structure (`json` and `binary` fields).
    ```go
    type ExecutionItem struct {
        JSON   map[string]interface{} `json:"json"`
        Binary map[string]interface{} `json:"binary,omitempty"`
    }
    ```

### State Management
*   **Global State**: Yes. `FlowEngine` holds `GlobalContext map[string]interface{}`.
*   **Node State**: `NodeResults` map stores the output of every executed node.
*   **Side Effects**:
    *   Platform nodes (Click, Swipe, OCR) are **impure**. They trigger side effects via `PythonBridge`.
    *   Logic nodes (If, Switch) are **pure** (mostly, barring logging).

### Data Flow
*   **Explicit**: Data is passed from node to node via `ExecutionData`.
*   **Implicit**: Nodes can access `GlobalContext` (variables set by `set_variable` node) or reference other nodes via expressions like `{{ $node["Name"].json.field }}`.

---

## 4. Bridge Analysis

*   **File**: `core/workflow_bridge.py`
*   **Nature**: It is a **Synchronous JSON-RPC over Stdio**.
*   **Protocol**:
    *   **Request**: `{"action": "click", "params": {...}}`
    *   **Response**: `{"signal": "success", "output": {...}}`
*   **Coupling**:
    *   **Loose**: Go doesn't know about Python objects, only action names.
    *   **Implicit Coupling**: The Go engine (`executor.go`) hardcodes action names (`click`, `swipe`) that must match `handle_action` in `workflow_bridge.py`.
*   **Bypass Logic**:
    *   The bridge **does not** bypass the runtime logic. It initializes the standard `PlatformService` (Adb or Robot) just like the script runtime does.
    *   However, it creates a *new* instance of the platform service for each workflow run, meaning persistent state (like open socket connections, though ADB is stateless HTTP-like) is re-initialized.

---

## 5. Platform Abstraction Analysis

*   **Abstraction Layer**: `core/service/platform/platform_service.py` defines the `PlatformService` abstract base class.
*   **Implementations**:
    *   **Android**: `core/service/platform/adb/adb_platform.py` implements `AdbPlatform`. Uses `adb` shell commands.
    *   **Desktop**: `core/service/platform/robot/robot_platform.py` implements `RobotPlatform`. Uses `pyautogui`.
*   **Consistency**: Both implementations expose the same API (`click`, `swipe`, `find_image`), allowing the Workflow Engine to be platform-agnostic (mostly).
*   **ADB**: ADB logic is encapsulated in `AdbPlatform` and `Adb` helper class. It is treated as a platform implementation detail, not a workflow dependency (Workflow passes `platform="android"` string).

---

## 6. Observability & Debugging

*   **Step Tracking**: `FlowEngine` has an `OnStep` callback (line 826 in `server/backend/server.go`) that streams `ExecutionStep` data to the frontend via WebSocket.
*   **Data Visibility**:
    *   **Input/Output**: Captured in `NodeResults` and sent in execution steps.
    *   **Logs**: `workflow_bridge.py` prints logs to stderr, which `executor.go` captures and forwards to the WebSocket/Console.
*   **State Inspection**:
    *   The engine tracks `Status` (success/error), `Duration`, and `Output` for every node.
*   **Debugging**:
    *   Visual debugging is supported by the frontend receiving real-time updates.
    *   However, "Pause/Resume" or "Breakpoints" are not currently implemented in `engine.go`.

---

## 7. Technical Debt & Risk Assessment

### Risk Checklist

| Risk | Severity | Description |
|------|----------|-------------|
| **Runtime Duplication** | High | `run_script.py` and `workflow_bridge.py` duplicate initialization logic. Changes to platform instantiation must be mirrored. |
| **RPC Overhead** | Medium | Every single action (click, find_image) requires a JSON-RPC roundtrip. High-frequency loops (e.g., checking a pixel 100 times/sec) will be slow. |
| **Stateful Complexity** | Medium | `GlobalContext` usage in workflows can lead to "spaghetti flows" where data dependencies are hidden. |
| **Error Handling** | Medium | Python exceptions are caught and returned as JSON errors. Stack traces might be lost or hard to read in the Go logs. |
| **Zombie Processes** | Low | `executor.go` attempts to kill the Python process on close, but forceful terminations might leave orphan `adb` or `python` processes if not handled carefully (though `cmd.Process.Kill()` is used). |

### Recommendations

1.  **Unify Entry Points**: Refactor `run_script.py` to use `workflow_bridge.py` logic or vice versa to ensure consistent platform initialization.
2.  **Optimize Loop Execution**: For tight loops (e.g., "wait for image"), push the logic down to Python (already partially done with `wait_image` action) rather than looping in the Go graph.
3.  **Schema Validation**: Implement strict JSON schema validation for the RPC messages to ensure Go and Python remain in sync.
4.  **Shared Constants**: The action names (`click`, `swipe`) are magic strings in both Go and Python. Define them in a shared config or code generation step.
