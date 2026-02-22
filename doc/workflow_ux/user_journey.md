# User Journey: Script Equivalence Task

**Role:** No-Code User (n8n/Zapier experience, no Python)
**Task:** Implement "If Button A exists, Click A. Else if Button B exists, Click B. Else Log."

## Phase 1: Implementation Attempt

### Step 1: Create Project & Workflow
- **Action:** Created "UX Test Project" and "Script Equivalence Test" workflow.
- **Experience:** Smooth. Dashboard is clear.

### Step 2: Add "Find Image" Node (Button A)
- **Action:** Clicked "+" button, searched "Find Image", added it.
- **Experience:**
  - Sidebar is clear.
  - Node appears on canvas.
  - **Confusion:** The node has a "Find Image" icon. I need to upload an image.
  - **Action:** Click node -> Nothing? Double click -> Opens Settings Modal.
  - **Pain Point:** The Settings Modal is full-screen/blocked (`z-[200]`). I cannot see the canvas or other nodes while configuring. In n8n/Zapier, it's usually a side panel or floating window.
  - **Configuration:** "Image" parameter requires an asset. Clicking it opens *another* modal (Asset Manager). Nested modals are confusing.

### Step 3: Add "If Condition"
- **Action:** Added "If Condition" node.
- **Connection:** Dragged from "Find Image" (Right handle) to "If Condition" (Left handle). Intuitive.
- **Configuration:**
  - **Goal:** Check if Button A was found.
  - **Pain Point:** "Value 1" input is a text box with `{{ ... }}` placeholder.
  - **Confusion:** "Do I have to write code?"
  - **Discovery:** Found `{}` icon (Variable Picker).
  - **Selection:** Picked `Find Image > found`.
  - **Result:** Inserted `{{ $node["Find Image"].json.found }}`.
  - **Critique:** The syntax `$node["Name"].json` is technical. "json" seems redundant for a user.
  - **Operator:** Selected `boolean:isTrue`. Clear.

### Step 4: Add "Click" (True Path)
- **Action:** Added "Click" node.
- **Connection:** Connected `If Condition` (True handle) to `Click`.
- **Configuration:**
  - **Goal:** Click coordinates of Button A.
  - **Pain Point:** "X" and "Y" fields are Number inputs. I cannot type `{{ ... }}` or pick a variable.
  - **Confusion:** "How do I use the dynamic X/Y from the previous node?"
  - **Discovery:** Hovered over field, saw a small toggle icon (`Switch to Expression`).
  - **Action:** Clicked toggle. Input became a text box.
  - **Action:** Used variable picker to select `Find Image > x`.
  - **Friction:** Had to do this twice (for X and Y). Why doesn't it allow variable selection by default?

### Step 5: Add Else Path (Button B)
- **Action:** Added another "Find Image" node.
- **Connection:** Connected `If Condition` (False handle) to the new "Find Image".
- **Action:** Renamed new node to "Find Button B" to distinguish it.
- **Confusion/Risk:** "If I rename the *first* node (Button A), will my `If Condition` break?"
  - **Verification:** The variable reference is `{{ $node["Find Image"]... }}`. If I rename the node to "Find Button A", the reference *will* break because it uses the node name (Label) as the key.
  - **Verdict:** **High Risk.** This forces users to name nodes perfectly *before* referencing them, or manually fix all expressions after renaming.

### Step 6: Final Logic
- **Action:** Added second "If Condition" for Button B.
- **Action:** Added "Click" for Button B (True).
- **Action:** Added "Log" for failure (False).
- **Experience:** Repetitive but straightforward logic. The "True/False" handles on `If Condition` make the flow easy to visualize.

## Analysis

### 1. Do I know what this node does?
- **Yes.** Icons and labels are clear.

### 2. Do I know the next step?
- **Yes.** Handles imply connection. "True/False" outputs on If Condition guide the logic.

### 3. If it fails, do I know why?
- **No.**
  - If `Find Image` fails (not found), does it error or just return `found=false`?
  - If `Click` fails (out of bounds?), the error output is likely a red edge, but debugging info inside the modal is needed.
  - **Debug:** During execution, I have to click the node to see "Output". But the modal blocks the view of the flow.

## 10-Point Checklist Assessment

1. **Conditional Branching:** **Yes.** `If Condition` with handles works.
2. **Nested Logic:** **Yes.** Can chain Ifs.
3. **Variables:** **Partial.** Can reference `$node`, but syntax is verbose. Global variables exist but "Set Variable" node is needed.
4. **Error Handling:** **Partial.** `Find Image` returns `found` boolean (good). But system errors (e.g., adb disconnect) might just stop flow.
5. **Visualization:** **Yes.** React Flow is good.
6. **Retry/Loop:** **Yes.** `Loop` node exists. Retry config on individual nodes is missing.
7. **Debug:** **Poor.** Modals block view. Execution inspector obscures context.
8. **Mental Model:** **Mixed.** "Inputs/Outputs" matches n8n. "Assets" modal is clunky.
9. **Maintainability:** **Low.** Renaming nodes breaks references.
10. **Predictability:** **Medium.** Flow is visual, but data flow (variables) is hidden in expressions.

## Summary of Pain Points
1.  **Modals are disruptive:** Full-screen blocking modals for node settings make it hard to reference other nodes or see the flow context.
2.  **Renaming breaks references:** Using Label as ID for variable lookup is fragile.
3.  **Variable Syntax:** `$node["Name"].json.key` is too technical for no-code.
4.  **Expression Toggling:** Hidden behind a small icon for primitive types (int/string).
5.  **Asset Management:** Nested modals (Settings -> Asset Manager) feel heavy.
