# PM Spec: Workflow UX Optimization

## Overview
Based on `user_journey.md`, the primary bottleneck for No-Code users is the **Variable Discovery** mechanism. Users cannot configure conditional logic without running the workflow first, creating a "Chicken and Egg" problem.

---

## Issue List & Specifications

### 1. Variable Discovery (Static Schema)
*   **Category:** Logic Understanding / Mental Model
*   **Problem:** The "Variable Picker" only lists data from `executionState`. If the workflow hasn't run, the list is empty (or shows "No output data"). Users cannot select previous node outputs (e.g., `found`) during configuration.
*   **Impact:** **High** (Blocker). Users are forced to guess syntax or run broken workflows.
*   **Improvement Direction:**
    *   Implement **Static Schema Resolution**.
    *   The Variable Picker should merge **Runtime Data** (if available) with **Static Definitions** (`outputs` from `nodeRegistry.ts`).
    *   If a node hasn't run, show its defined outputs (e.g., `found`, `x`, `y` for "Find Image") as available variables.
*   **Acceptance Criteria:**
    *   Add a "Find Image" node.
    *   Add an "If Condition" node.
    *   Open "If Condition" settings -> Click Variable Picker.
    *   **Verify:** "Find Image" node is listed.
    *   **Verify:** Expanding it shows `found`, `x`, `y` (derived from registry), even if execution count is 0.
    *   **Verify:** Clicking `found` inserts `{{ $node["Find Image"].output.found }}` (or correct path).

### 2. Expression Syntax Guidance
*   **Category:** Logic Understanding
*   **Problem:** Users do not know they need to type `{{ ... }}` or that expressions are available. The interface looks like a plain text box.
*   **Impact:** **Medium**.
*   **Improvement Direction:**
    *   Visual "Expression Mode" toggle is good (already exists), but the input itself should provide **Autocomplete** or **Syntax Highlighting**.
    *   At minimum, the Variable Picker should be more prominent or automatically trigger when typing `{{`.
*   **Acceptance Criteria:**
    *   When typing `{{` in an expression field, the Variable Picker (or a dropdown) should automatically appear.

### 3. Condition Builder (Low-Code View)
*   **Category:** Condition Branching
*   **Problem:** The `If Condition` node asks for "Value 1" (Expression) and "Value 2" (Expression). This is too raw for simple tasks like "If Found".
*   **Impact:** **Medium**.
*   **Improvement Direction:**
    *   Not in scope for this MVC (too complex to rebuild UI).
    *   *Mitigation:* Solve Issue #1 (Static Schema) to make "Value 1" easy to fill.

### 4. Node Discovery
*   **Category:** Mental Model
*   **Problem:** The "Add Node" sidebar is a flat list (filtered). Categories exist but visual scanning is hard.
*   **Impact:** **Low**.
*   **Improvement Direction:**
    *   Keep as is for now. Search works well.

---

## Implementation Plan (Phase 3 Scope)

1.  **Refactor `ExpressionInput.tsx`:**
    *   Modify `nodeResults` generation logic.
    *   Inject `NODE_DEFINITIONS` (from registry) into the component.
    *   If `executionState` is missing for a node, fallback to `nodeDef.outputs`.

2.  **Refactor `WorkflowView.tsx`:**
    *   Ensure `nodes` (state) is passed correctly to `ExpressionInput` to allow looking up the node type.

## Risk Assessment
*   **Schema Mismatch:** Python dynamic outputs might differ from static `nodeRegistry` definitions.
    *   *Mitigation:* Update `nodeRegistry.ts` to be accurate.
*   **Complex Objects:** Static schema usually defines top-level keys. Deep nested JSON is hard to predict statically.
    *   *Acceptance:* Top-level keys (e.g., `found`) are sufficient for 80% of cases.
