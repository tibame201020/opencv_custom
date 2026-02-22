# User Journey: Script Equivalence Task

**Role:** No-Code User (n8n/Zapier experience, no Python)
**Task:** Implement "If Button A exists, Click A. Else if Button B exists, Click B. Else Log."
**Verification Date:** 2026-02-22
**Branch:** feature/virtual-workflow

## Phase 1: Implementation Attempt (Simulated via Playwright)

### Step 1: Open Application
- **Screenshot:** `screenshots/01_home.png`
- **Action:** Landed on the dashboard.
- **Experience:**
  - The default view is **Execution**, which shows "No Script Active".
  - There is **no "New Workflow" button** visible immediately.
  - **Confusion:** "Where do I start? I want to create a workflow."
  - **Resolution:** Found "Workflow" in the sidebar.
- **Q1 (Know what node does?):** N/A (App Navigation).
- **Q2 (Know next step?):** No. Had to search for "Workflow" tab.
- **Q3 (Know failure cause?):** N/A.

### Step 2: Create Project
- **Screenshot:** `screenshots/02_workflow_tab.png`
- **Action:** Clicked "New Project".
- **Experience:**
  - **Confusion:** I cannot create a workflow directly. I must create a "Project" first.
  - **Input Confusion:** The modal placeholder says "e.g. Shopping App". It wasn't immediately clear if this is the project name or category.
  - **Friction:** Modal blocking UI.
- **Q1:** Yes.
- **Q2:** Yes (Create Workflow inside project).
- **Q3:** Yes.

### Step 3: Create Workflow
- **Screenshot:** `screenshots/03_workflow_editor.png` (Modal shown)
- **Action:** Hovered project card -> Clicked "New Workflow" -> Filled Name -> Clicked Create.
- **Experience:**
  - **Hidden UI:** The "New Workflow" button is hidden inside the project card and only appears on hover.
  - **Friction:** Another modal to fill.
  - **Initial State:** The editor opens with a big "Add first step" button in the center, but also a "+" button in the toolbar.
  - **Inconsistency:** "Add first step" vs Toolbar "+". Which one should I use?
- **Q1:** Yes (Empty canvas).
- **Q2:** Yes (Add node).
- **Q3:** No.

### Step 4: Add First Node ("Find Image")
- **Screenshot:** `screenshots/04_node_a_added.png`
- **Action:** Clicked "Add first step" -> Searched "Find Image" -> Added.
- **Experience:** Smooth.
- **Q1:** Yes.
- **Q2:** Yes.
- **Q3:** N/A.

### Step 5: Configure Node (Settings Modal)
- **Screenshot:** `screenshots/05_node_a_settings.png`
- **Action:** Double-clicked node to open settings.
- **Experience:**
  - **CRITICAL UX ISSUE:** The settings modal (Z-Index 200) covers the **entire screen** (or a large portion), blocking the canvas.
  - **Context Loss:** I cannot see the node connections or other nodes while configuring.
  - **Closing Friction:** Attempting to add the next node failed because the modal overlay was still intercepting clicks (Z-index issue). The "Close" interaction (Escape or X) didn't immediately clear the backdrop for the test script.
- **Q1:** Yes (Parameters are clear).
- **Q2:** Yes (Close and continue).
- **Q3:** No. If the modal gets stuck or blocks clicks, I don't know why.

### Step 6: Add Second Node ("If Condition")
- **Screenshot:** `screenshots/06_connected_a_if.png`
- **Action:** Clicked Toolbar "+" -> Searched "If Condition".
- **Experience:**
  - **Search Ambiguity:** When searching for "If Condition", the search result highlighted the **existing node on the canvas** (if I had one) instead of clearly offering a "New Node" from the palette.
  - **Connection Friction:** Handles for connecting nodes were hard to find/click programmatically, implying they might be small or require precise hover.
- **Q1:** Yes.
- **Q2:** Yes.
- **Q3:** No. Why did search select the existing node instead of adding a new one?

### Step 7: Constructing the Logic (Script Equivalence)
- **Screenshot:** `screenshots/07_full_structure_partial.png`
- **Logic:** "If A -> Click A. Else -> If B -> Click B."
- **Findings:**
  - **Branching:** The "If Condition" node has clear True/False outputs. This is good.
  - **Variables:** Accessing the result of "Find Image" (Node A) inside "If Condition" requires understanding the variable syntax (e.g., `{{ $node["Find Image"].json.found }}`). This is **High Friction** for no-code users.
  - **Renaming:** If I rename "Find Image" to "Find Button A", the variable reference might break if not automatically updated.

## 10-Point Checklist Assessment

1.  **Conditional Branching:** **Yes.** `If Condition` node works.
2.  **Nested Logic:** **Partial.** Visual nesting is easy, but managing variables across levels is hard.
3.  **Variables & State:** **No/Partial.** Variable syntax is too technical (`$node["Name"].json`).
4.  **Error Path:** **Yes.** "False" path on `Find Image` (via `If Condition`) allows fallback.
5.  **Visualization:** **Yes.** React Flow graph is clear.
6.  **Retry/Loop:** **Unknown.** Did not test Loop node.
7.  **Debug:** **Poor.** Modals block the view.
8.  **Mental Model:** **Mixed.** Project/Workflow hierarchy adds friction. Search behavior is confusing.
9.  **Maintainability:** **Low.** Renaming nodes might break references.
11. **Error Predictability:** **Low.** If a modal blocks UI, user is stuck.

## Summary of Pain Points
1.  **Modal Blocking:** Settings modal blocks canvas interaction and context.
2.  **Search Ambiguity:** Search bar finds nodes on canvas, confusing the "Add Node" action.
3.  **Variable Syntax:** Requires technical knowledge of JSON structure.
4.  **Navigation Hierarchy:** "Project -> Workflow" is strict and hidden.
5.  **Handle Visibility:** Connections require precise mouse movements.
