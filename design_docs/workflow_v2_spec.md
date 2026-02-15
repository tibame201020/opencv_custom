# Workflow Editor V2 Specification (Cloud n8n Clone)

## Overview
This specification details the UI/UX changes required to bring the Workflow Editor to parity with n8n Cloud (v1+). The primary goal is to provide a user-friendly, visually consistent interface for non-programmers, moving away from the script-based paradigm.

## 1. Node Design (The "Card")
The core visual element is the Node. It must transition from a generic square to a detailed rectangular card.

-   **Dimensions**: width: `w-48` (192px), height: dynamic/auto (min-h-16).
-   **Structure**:
    -   **Header**:
        -   **Icon**: 24x24px, colored based on node type, on the left.
        -   **Title**: Bold text, truncated if too long.
        -   **Subtitle**: Smaller, gray text below title (e.g. "Wait 2s", "Click (100,200)").
    -   **Body**:
        -   **Status Indicator**: A small badge (check/spinner/cross) in the top-right corner, overlapping the border.
        -   **Actions**: Hovering reveals action buttons (Execute, Disable, Delete) floating *above* the node.
    -   **Handles**:
        -   **Input**: Left-center dot.
        -   **Output**: Right-center dot.
        -   **Conditional Output**: Multiple dots on the right, labeled (e.g. "true", "false", "default").

-   **Interaction**:
    -   **Hover**: Border turns green (success) or highlights.
    -   **Selected**: Blue border/shadow.
    -   **Dragging**: Smooth drag with snap-to-grid (optional).

## 2. Smart Edges (Connections)
Connections between nodes must convey execution status and data flow.

-   **Style**: Bezier curves (`getBezierPath`).
-   **Color Coding**:
    -   **Gray**: Not executed.
    -   **Green**: Success (True path).
    -   **Red**: False path (for If/Switch nodes).
    -   **Orange**: Executing.
-   **Data Pills**:
    -   Small rounded badges on the edge line.
    -   Display: "1 item" (count) or "true"/"false" (branch label).
    -   Interactive: Hovering reveals "Insert Node" (+) or "Delete" (Trash) buttons.

## 3. Execution Inspector (Bottom Panel)
The execution log must move from a simple console output to a rich, interactive inspector.

-   **Layout**: Split-pane view (resizable).
-   **Left Pane: Step List**:
    -   Vertical list of executed nodes in chronological order.
    -   Each item shows: Node Icon, Name, Duration, Status.
    -   Clicking an item highlights the corresponding node on the canvas.
-   **Right Pane: Data Preview**:
    -   Tabs: "Input", "Output".
    -   View: JSON Tree view or Table view of the data items.
    -   Header: "1 item" (count), "JSON" / "Binary" toggle.
    -   Empty State: "No data" message.

## 4. Canvas Controls
-   **Zoom Toolbar**: Bottom-left corner (Fit, Zoom In, Zoom Out).
-   **MiniMap**: Bottom-right corner (toggleable).
-   **Add Node Button**: Floating "+" button top-right or drag from output handle.

## 5. Backend Integration
-   **Data Flow**: Ensure `FlowEngine` passes data as `[]interface{}` (items array) to match n8n's structure, even if currently it uses `interface{}`. The UI should visualize this array.
-   **Logs**: `ExecutionStep` events must include `Output` data for the Inspector to render.

## 6. Verification Plan
-   **Frontend Build**: `npm run build` must pass.
-   **Backend Tests**: `go test ./...` must pass.
-   **Manual Check**:
    -   Verify Node appearance matches spec.
    -   Verify Drag-and-Drop works.
    -   Verify Execution Inspector shows correct data after running a workflow.
