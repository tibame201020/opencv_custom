# User Journey: Script Equivalence Task

**Role:** No-Code User (n8n/Zapier experience, no Python)
**Task:** Implement "If Button A exists, Click A. Else if Button B exists, Click B. Else Log."
**Verification Date:** 2025-05-20
**Branch:** feature/virtual-workflow
**Method:** Code Analysis Simulation (Headless Environment)

## Phase 1: No-Code User Experience Recording

### Step 1: Add "Find Image" Node (Button A)
*   **Action:** User searches for "Find Image" and adds it to the canvas to look for Button A.
*   **Inputs:** Selects `image_A.png` from assets.
*   **Observation (UX):** The node has `found`, `x`, `y` data outputs but **no True/False flow handles**.
*   **Friction:** User expects to drag a "Found" connection directly to "Click". Instead, the node only outputs data.
*   **Q1 (Know what node does?):** Yes. Finds an image.
*   **Q2 (Know next step?):** No. Confused why there is no "Found" path to connect.
*   **Q3 (Know failure cause?):** N/A.
*   **Evidence:** `frontend/src/workflow/nodeRegistry.ts` (Definition of `find_image`):
    ```typescript
    outputs: [
        { key: 'found', label: 'Found', type: 'bool' },
        { key: 'x', label: 'X', type: 'number' },
        { key: 'y', label: 'Y', type: 'number' },
    ],
    // Missing handleConfig for True/False flow
    ```

### Step 2: Add "If Condition" Node (Check A)
*   **Action:** User realizes they need a logic node and adds "If Condition".
*   **Inputs:** Needs to check if Button A was found.
*   **Friction (High):** The user must manually write an expression to reference the previous node's output.
    *   Field: `Value 1`
    *   Required Input: `{{ $nodes["Find Image"].output.found }}` (or similar syntax depending on UI helper).
    *   This breaks the "No-Code" promise; it requires understanding JSON paths and node naming (e.g., spaces in names).
*   **Q1 (Know what node does?):** Yes. Logic branching.
*   **Q2 (Know next step?):** Yes. It has explicit "True" and "False" output handles.
*   **Q3 (Know failure cause?):** No. If the expression has a typo or the node name changes, it will fail silently or error at runtime.
*   **Evidence:** `frontend/src/workflow/nodeRegistry.ts` (Definition of `if_condition`):
    ```typescript
    params: [
        { key: 'value1', label: 'Value 1', type: 'expression', required: true, ... },
        // ...
    ],
    handleConfig: {
        sources: [
            { id: 'true', label: 'True' },
            { id: 'false', label: 'False' },
        ],
    },
    ```

### Step 3: Add "Click" Node (Action A)
*   **Action:** User connects the **True** handle of the "If" node to a new "Click" node.
*   **Inputs:** `x`, `y`.
*   **Friction:** The user must again use expressions to bind the coordinates found in Step 1.
    *   X: `{{ $nodes["Find Image"].output.x }}`
    *   Y: `{{ $nodes["Find Image"].output.y }}`
*   **Alternative:** User might try `Click Image` node.
    *   If using `Click Image`, they must select `image_A.png` *again*.
    *   Redundancy: The workflow searches for A (Step 1), then searches for A *again* (Step 3). This is inefficient and confusing.
*   **Q1 (Know what node does?):** Yes.
*   **Q2 (Know next step?):** Yes. End of this branch.
*   **Q3 (Know failure cause?):** Yes, if coordinates are invalid.

### Step 4: Add "Find Image" Node (Button B)
*   **Action:** User connects the **False** handle of the "If" node (Step 2) to a new "Find Image" node.
*   **Inputs:** Selects `image_B.png`.
*   **Friction:** The new node is automatically named "Find Image 1" (or similar).
*   **Q1:** Yes.
*   **Q2:** No (same issue as Step 1).
*   **Q3:** N/A.

### Step 5: Add "If Condition" Node (Check B)
*   **Action:** Adds another "If Condition" to check Button B.
*   **Inputs:** `Value 1`: `{{ $nodes["Find Image 1"].output.found }}`.
*   **Friction:** Variable reference complexity increases. User must track which "Find Image" node they are referencing. If they rename "Find Image 1" to "Find B", they must update the expression manually unless the UI handles refactoring (unverified, risky).
*   **Q1:** Yes.
*   **Q2:** Yes.
*   **Q3:** No. Expression errors are likely.

### Step 6: Add "Click" Node (Action B)
*   **Action:** Connects **True** handle of second "If" to a "Click" node.
*   **Inputs:** X/Y expressions referencing "Find Image 1".
*   **Q1:** Yes.
*   **Q2:** Yes.
*   **Q3:** Yes.

### Step 7: Add "Log" Node (Fallback)
*   **Action:** Connects **False** handle of second "If" to a "Log" node.
*   **Inputs:** Message "Neither found".
*   **Experience:** This part is straightforward.
*   **Q1:** Yes.
*   **Q2:** Yes.
*   **Q3:** N/A.

## Summary of Pain Points

1.  **Lack of Integrated Flow Control:**
    *   `Find Image` does not have "Found/Not Found" paths.
    *   **Consequence:** Requires an explicit `If Condition` node for every check, doubling the node count (7 nodes vs 4 logical steps).

2.  **Expression Complexity:**
    *   Users must write `{{ $nodes["NodeName"].output.param }}`.
    *   **Consequence:** High barrier to entry. "Script Equivalence" is failed because it's *harder* than writing `if find(A): click(A)`.

3.  **Redundancy/Inefficiency:**
    *   To click a found image, one must either manually map coordinates (tedious) or use `Click Image` (redundant search).

4.  **Node Naming & References:**
    *   Reliance on node names in expressions makes the workflow brittle to renaming.

## Conclusion

The current workflow implementation **fails** the "No-Code Friendly" requirement for this specific task. While it is *technically* equivalent to a script (it *can* do the logic), the UX friction is so high that a user would prefer writing Python.
