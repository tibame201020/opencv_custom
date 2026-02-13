# n8n UI Redesign Specification V2 (Square Nodes & External Labels)

## Overview
This specification supersedes V1. The goal is to match the "Canvas View" style of n8n cloud (v1+), where nodes are square icons with labels placed below them on a transparent background.

## 1. Node Container (`GenericNode`)
- **Shape**: Square (`w-16 h-16` or `64px x 64px`).
- **Border Radius**: Large rounded corners (`rounded-2xl` / `20px`).
- **Background**: White (`bg-white`).
- **Shadow**:
  - Default: `shadow-sm` or none (flat look with border).
  - Hover: `shadow-md` or `ring-2 ring-primary/20`.
  - Selected: `ring-2 ring-primary`.
- **Border**: Thin gray border (`border-gray-200`).
- **Content**:
  - **Center Icon**: Large colored icon (size `24px` or `32px`).
  - **Status Badge**: Small green checkmark (`w-4 h-4`) in the bottom-right corner *inside* the border.
  - **Execution Badge**: (Optional) Small lightning/status icon in top-left.

## 2. Labels & Typography
- **Position**: **Outside** the node container, directly below.
- **Background**: **Transparent**.
- **Alignment**: Center-aligned relative to the node.
- **Main Label**:
  - Font: Bold, Sans-serif.
  - Color: Dark Gray / Black (`text-gray-900`).
  - Size: Small (`text-sm`).
  - Truncation: 2 lines max, ellipsis.
- **Subtitle**:
  - Position: Below Main Label.
  - Font: Regular.
  - Color: Gray (`text-gray-500`).
  - Size: Extra Small (`text-xs`).
  - Truncation: 1 line.

## 3. Hover Toolbar (Shortcuts)
- **Position**: Floating **above** the node (centered or top-left aligned), with some margin (`-top-12`).
- **Background**: **Transparent** (No white pill container).
- **Icons**:
  - Row of icons: Play, Eye (Disable), Trash, More (Dots).
  - Color: Gray (`text-gray-500`), hover to Primary/Black.
  - Spacing: `gap-2`.
  - Animation: Fade in on node hover.

## 4. Connection Handles (Stubs)
- **Output (Right)**:
  - **Stub Line**: A gray line (`w-6 h-0.5 bg-gray-300`) extending from the center-right edge of the node.
  - **Stub End**: A small square/rounded button (`w-5 h-5`) at the end of the line.
  - **Content**: A `+` icon inside the button.
  - **Interaction**:
    - Click `+`: Open "Add Node" sidebar.
    - Drag `+`: Create connection.
- **Input (Left)**:
  - Small circle (`w-3 h-3`) on the center-left border.
  - Color: Gray/White border.

## 5. Edges
- **Style**: Bezier curves.
- **Color**: Gray (`#9ca3af`) default, Green (`#22c55e`) when executed.
- **Labels**: Small pill-shaped text on edges (e.g., "true", "false", "1 item").

## 6. Grid
- **Pattern**: Dotted grid (`#d4d4d8`), spacing `20px`.
- **Background**: Light Gray (`#f5f5f5`).

## Reference
- See `image.png` for visual confirmation.
