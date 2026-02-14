# n8n UI Redesign Specification V3 (Refined based on Screenshots)

## Overview
This specification refines V2 based on direct visual reference from n8n cloud (v1+). The goal is pixel-perfect alignment with the "Canvas View" and "Execution Inspector".

## 1. Execution Inspector (Bottom Panel)
This replaces the simple log dump. It is a split-pane view at the bottom of the screen.

-   **Container**:
    -   Height: Resizable or fixed (e.g., `300px`).
    -   Background: White (`bg-white`).
    -   Border Top: `border-gray-200`.
    -   Shadow: Large shadow upwards (`shadow-[0_-4px_20px_rgba(0,0,0,0.1)]`).

-   **Left Pane: Execution List ("Logs")**:
    -   Header: "Logs" (Small, bold).
    -   Content: Vertical list of executed nodes.
    -   Item Style:
        -   Icon (Node Type Icon).
        -   Label (Node Name).
        -   Status Icon (Green Check, Red X).
        -   Hover: Light gray background.
        -   Selected: Blue background (`bg-blue-50`), blue text.
    -   Width: Fixed (e.g., `250px`) or resizable.

-   **Right Pane: Data Preview ("Edit Fields")**:
    -   Header:
        -   Node Name (Bold).
        -   Execution Time ("Success in 1ms").
        -   Tabs: "Input", "Output".
    -   Content:
        -   **Split View**: Input (Left) vs Output (Right) OR Single View based on tab.
        -   **Data View**:
            -   "1 item" indicator.
            -   JSON/Table view of the data.
            -   Empty State: "This is an item, but it's empty."

## 2. Smart Edges
Edges must convey flow status and data volume.

-   **Style**: Bezier Curves.
-   **Colors**:
    -   **Default/Unexecuted**: Gray (`#9ca3af`).
    -   **Success/True**: Green (`#22c55e`).
    -   **False**: Red/Orange (`#ef4444` or `#f97316`).
-   **Labels (Pills)**:
    -   Shape: Rounded pill (`rounded-full`).
    -   Background: White (`bg-white`).
    -   Border: Thin gray (`border-gray-200`).
    -   Text: Small (`text-[10px]` or `text-xs`).
    -   Content:
        -   "1 item" (Data count).
        -   "true" / "false" (Branch output).
    -   Position: Midpoint of the edge segment.

## 3. Node Refinements
-   **Shape**: Rounded Rectangle/Square.
-   **Status Badge**:
    -   Position: **Top-Right Corner**, overlapping the border by 50%.
    -   Size: Small circle (`w-5 h-5`).
    -   Icon: White checkmark on Green background (Success).
-   **Handles**:
    -   **Input**: Left center.
    -   **Output**: Right center.
    -   **Stub**: The "Plus" button logic (already implemented) needs to ensure it aligns with the right edge visually.

## 4. Canvas Controls
-   **Zoom Toolbar**:
    -   Position: **Bottom Left** (floating).
    -   Style: Horizontal group of buttons.
    -   Icons: Fit, Zoom In, Zoom Out, Reset.
    -   Background: White, shadow, rounded.

## 5. Top Bar (Adjustments)
-   **Breadcrumbs**: "Personal / [Workflow Name]".
-   **Toggle**: "Editor | Executions".
-   **Action Button**: "Execute workflow" (Primary Color/Red-Orange).
