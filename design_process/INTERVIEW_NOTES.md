# Interview Notes - n8n Workflow Editor Visual Analysis

## Source Material
- `image.png`: User provided screenshot of n8n workflow editor.
- User Instructions:
  - "Adjust node size."
  - "Text explanation usually directly below the node and background transparent."
  - "Mouse hover shortcut function is also transparent background."
  - "Please completely re-do."

## Detailed Observations

### 1. Node Appearance
- **Shape**: Square container. Large rounded corners (looks like `rounded-2xl` or `20px`).
- **Background**: White (`#ffffff`).
- **Shadow**: Subtle shadow (`shadow-sm` or `shadow-md` on hover).
- **Border**: Thin gray border (`border-gray-200`). Selected state likely has a colored border or ring.
- **Content**:
  - **Center**: A large icon. The icon itself is colored (e.g., Green for Logic, Orange for Code, Blue for Action). The icon size is significant relative to the box (maybe 40-50% of box size).
  - **Status Badge**: A small green checkmark icon located in the bottom-right corner *inside* the box.
  - **Execution Badge**: A small lightning bolt (orange) in top-left? (Seen on the "Click" node).

### 2. Labels & Text
- **Position**: **Outside** the node box, directly below it.
- **Background**: **Transparent**. The text sits directly on the canvas grid.
- **Main Label**: Bold, dark gray/black (`text-gray-800`, `font-bold`, `text-sm`).
- **Subtitle/Description**: Below main label, smaller, lighter gray (`text-xs`, `text-gray-500`).
- **Alignment**: Center aligned relative to the node.

### 3. Hover Toolbar (Shortcuts)
- **Position**: Floating **above** the node (top-center or top-left aligned?).
- **Style**: **Transparent background**. It appears as a row of icons without a visible container box (or a very subtle one).
- **Icons**:
  - Play (Execute)
  - Power/Eye (Disable/Enable)
  - Trash (Delete)
  - Dots (More Options)
- **Color**: Dark gray icons (`text-gray-600`), likely hover to darker/colored.

### 4. Connection Handles (Stubs)
- **Output (Right)**:
  - A straight gray line extends from the right edge of the node box.
  - Length: Approx 20-30px.
  - End: A small square or rounded-square button with a `+` icon.
  - Style: Gray line, gray button background (or white with gray border).
- **Input (Left)**:
  - A small circle on the left border of the node box.
  - Color: Gray/White.

### 5. Edges
- **Style**: Bezier curves (`smoothstep` or `default`).
- **Labels**: Small pill-shaped labels on the edge (e.g., "1 item", "true", "false").
- **Color**: Green for successful execution path, Gray for unused.

## Action Items for Engineer
- Refactor `GenericNode` to be a square icon container.
- Move `label` and `subtitle` divs outside the main node `div`.
- Remove the white background/shadow from the Hover Toolbar.
- Ensure the connection stub extends correctly from the square node.
