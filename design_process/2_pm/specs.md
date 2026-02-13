# Product Specifications: Android Workflow Editor

## 1. Goal
Provide a visual, node-based editor for creating Android automation workflows without coding, similar to n8n.

## 2. Architecture
-   **Frontend**: React + React Flow (`@xyflow/react`).
-   **Backend**: Go (Wails) managing workflow execution.
-   **Execution Engine**: Go-based `FlowEngine` that traverses the graph.
-   **Bridge**: Python process (`workflow_bridge.py`) handling ADB and OpenCV operations.

## 3. Data Model (JSON Schema)
The workflow is stored as a JSON object matching `server/workflow/engine.go`:

```json
{
  "id": "uuid",
  "name": "My Workflow",
  "nodes": {
    "node_id_1": {
      "id": "node_id_1",
      "type": "click",
      "name": "Click Start",
      "config": { "x": 100, "y": 200 },
      "x": 0, "y": 0
    }
  },
  "edges": [
    { "id": "e1", "fromNodeId": "node_id_1", "toNodeId": "node_id_2", "signal": "success" }
  ]
}
```

## 4. Node Specifications
### 4.1. Platform Nodes (Android)
-   `click(x, y)`: Tap screen at coordinates.
-   `swipe(x1, y1, x2, y2, duration)`: Drag from A to B.
-   `type_text(text)`: Input string via ADB keyboard.
-   `key_event(key_code)`: Press physical key (Home, Back).
-   `screenshot()`: Capture screen.

### 4.2. Vision Nodes (OpenCV)
-   `find_image(image_path, threshold)`: Locate image on screen.
-   `click_image(image_path)`: Find and click.
-   `wait_image(image_path, timeout)`: Block until image appears.
-   `ocr_text(region)`: Extract text from area.

### 4.3. Logic Nodes
-   `if_condition(value1, operator, value2)`: Branching logic.
-   `loop(count, condition)`: Repeat actions.
-   `wait(seconds)`: Pause execution.

## 5. User Interface (UI/UX)
-   **Canvas**: Drag and drop nodes.
-   **Properties Panel**: Context-sensitive configuration (e.g., when clicking "Click Node", show X/Y inputs).
-   **Execution**:
    -   **Toolbar Run**: Executes the entire workflow via backend API.
    -   **Canvas Execute**: A floating button to execute visually (Legacy/Mock to be removed or connected to real API).
-   **Feedback**: Show execution logs and success/failure status on nodes.

## 6. Runtime Behavior
1.  **Trigger**: User clicks "Run".
2.  **Payload**: Frontend sends workflow JSON to `POST /api/workflows/:id/run`.
3.  **Processing**:
    -   Go Backend parses JSON.
    -   `FlowEngine` starts at root node.
    -   For each node:
        -   If logic node -> Go handles it.
        -   If platform node -> Go sends JSON command to `workflow_bridge.py` stdin.
        -   Python executes ADB command and returns JSON result to stdout.
4.  **Result**: Backend returns execution log and final output to Frontend.

## 7. Implementation Gaps & Tasks
1.  **Frontend Wiring**: The `WorkflowView` component currently has a mock execution loop. This must be replaced or connected to the real `handleRun` function from `WorkflowEditorView`.
2.  **API Connection**: Ensure the `onRun` prop is passed down correctly.
