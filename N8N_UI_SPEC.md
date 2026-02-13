# n8n UI Redesign Specification

## Overview
This document outlines the changes required to align the local workflow editor UI/UX with the n8n cloud experience (v1+).

## 1. Canvas Styling
- **Background Color**: `#f5f5f5` (Light Gray) for light mode.
- **Grid Pattern**: Dotted pattern.
  - `gap`: 20
  - `size`: 1
  - `color`: `#d4d4d8` (Tailwind gray-300).
- **Behavior**: Pan on drag, Zoomable.

## 2. Empty State (No Nodes)
When the workflow is empty, display two large action buttons in the center of the canvas:
1.  **Add first step...**
    -   Style: Dashed border (`2px dashed #ccc`), rounded (`16px`), transparent background.
    -   Size: ~120px x 120px.
    -   Content: Plus icon (large) + Text "Add first step...".
    -   Hover: Border color changes to primary or darker gray.
    -   Action: Opens the "Add Node" sidebar.
2.  **Build with AI**
    -   Style: Similar to above.
    -   Content: Stars/Magic icon + Text "Build with AI".
    -   Action: (Optional/Placeholder) Opens AI prompt.

## 3. Right Toolbar
Replace the current top-right controls with a vertical floating toolbar on the right side.
-   **Position**: Absolute, top-20 right-4 (below header).
-   **Style**: White background, `shadow-lg`, `rounded-xl`, `border border-gray-100`.
-   **Items (Vertical Stack)**:
    1.  **Plus (+)**: Add Node (Opens Sidebar).
    2.  **Search (Magnifier)**: Search nodes/workflow.
    3.  **Variables (Braces)**: Toggle Variables panel (Sidebar).
    4.  **Zoom Controls**: (Can be a separate group or integrated).

## 4. Node Design (GenericNode)
Update the `GenericNode` component to match n8n cards:
-   **Shape**: Rounded rectangle (`rounded-xl` or `12px`).
-   **Size**: Min width ~180px.
-   **Background**: White (`bg-white` / `bg-base-100`).
-   **Shadow**: `shadow-sm` normally, `shadow-md` on hover.
-   **Border**: Thin border `border-gray-200`. Selected: `ring-2 ring-primary`.
-   **Layout**:
    -   **Left**: Icon container. Rounded-lg, colored background (based on node type), white icon. Size ~40px.
    -   **Center**: Title (bold, small), Subtitle (xs, gray).
    -   **Right**: Status indicator (if running), Menu trigger (kebab/dots) on hover.
-   **Node Hover Toolbar**:
    -   Appears slightly above the node when hovered (or when selected).
    -   **Style**: White pill/capsule shape, shadow-lg, `gap-1`, small icon buttons.
    -   **Actions**:
        -   **Execute Step**: Lightning/Play icon.
        -   **Disable**: Eye/Slash icon (toggle).
        -   **Delete**: Trash icon.
        -   **More**: Dots (opens full menu).
-   **Handles (Stubs)**:
    -   **Input**: Left center, small dot or circle on the edge.
    -   **Output (Right)**:
        -   Instead of a dot on the border, create a "Stub" extending to the right (`~20px` long line).
        -   End of stub has a `+` button/circle.
        -   Hovering the stub highlights it.
        -   Dragging from the stub creates a connection.
        -   Clicking the `+` opens the Add Node Sidebar and auto-connects the new node.

## 5. Edge Design (HoverEdge)
-   **Style**: Bezier curve (`default` or `getBezierPath`). **Not SmoothStep**.
    -   Should look like a smooth S-curve.
-   **Color**: Gray-400 (`#9ca3af`).
-   **Width**: 2px.
-   **Hover**: Shows a "Plus" button in the middle of the edge to insert a node.
-   **Behavior**: Updates smoothly when dragging nodes.

## 6. Menu Interactions (Sidebar)
-   **Add Node Menu**:
    -   **Type**: Sliding Sidebar (Drawer) from the right.
    -   **Animation**: Slides in/out.
    -   **Content**: Search bar at top, categorized list of nodes.
    -   **Trigger**:
        -   Clicking "Add Node" button in toolbar.
        -   Clicking `+` on empty canvas.
        -   Clicking `+` on a node's output stub.
    -   **Behavior**: When triggered from a node stub, adding a node automatically connects it to that stub.

## 7. Header
-   Ensure the header is clean, white background, with "Active" toggle and "Execute" buttons.

## References
-   See `frontend/n8n_canvas_empty.png` for empty state.
-   See `frontend/n8n_node_menu.png` for menu (if visible) or toolbar layout.
