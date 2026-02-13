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
    -   Action: Opens the "Add Node" menu.
2.  **Build with AI**
    -   Style: Similar to above.
    -   Content: Stars/Magic icon + Text "Build with AI".
    -   Action: (Optional/Placeholder) Opens AI prompt.

## 3. Right Toolbar
Replace the current top-right controls with a vertical floating toolbar on the right side.
-   **Position**: Absolute, top-20 right-4 (below header).
-   **Style**: White background, `shadow-lg`, `rounded-xl`, `border border-gray-100`.
-   **Items (Vertical Stack)**:
    1.  **Plus (+)**: Add Node.
    2.  **Search (Magnifier)**: Search nodes/workflow.
    3.  **Variables (Braces)**: Toggle Variables panel.
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
-   **Handles**:
    -   Input: Left center.
    -   Output: Right center.
    -   Style: Small circle, gray by default.

## 5. Edge Design (HoverEdge)
-   **Style**: Bezier curve (`default` or `smoothstep` with `borderRadius`).
-   **Color**: Gray-400 (`#9ca3af`).
-   **Width**: 2px.
-   **Hover**: Shows a "Plus" button in the middle of the edge to insert a node.

## 6. Menu Interactions
-   **Add Node Menu**:
    -   Should be a sliding panel from the right OR a modal/popover near the click.
    -   For this iteration, a floating menu (as currently implemented but styled better) is acceptable if the sliding panel is too complex.
    -   Style: White, shadow-xl, rounded-lg. Search bar at top. List of categories/nodes.

## 7. Header
-   Ensure the header is clean, white background, with "Active" toggle and "Execute" buttons.

## References
-   See `frontend/n8n_canvas_empty.png` for empty state.
-   See `frontend/n8n_node_menu.png` for menu (if visible) or toolbar layout.
