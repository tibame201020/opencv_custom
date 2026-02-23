# User Journey: Script Equivalence Task

**Role:** No-Code User (n8n/Zapier experience, no Python)
**Task:** Implement "If Button A exists, Click A. Else if Button B exists, Click B. Else Log."
**Verification Date:** 2025-05-24
**Branch:** feature/virtual-workflow
**Method:** Code Analysis & Simulation

## Phase 1: No-Code User Experience Recording

### Step 1: Add "Find Image" Node (Button A)
*   **Action:** User searches for "Find Image" and adds it to the canvas to look for Button A.
*   **Inputs:** Selects `image_A.png` from assets.
*   **Observation (UX):** The node has `found`, `x`, `y` data outputs but **no True/False flow handles**.
*   **Friction:** User expects to drag a "Found" connection directly to "Click". Instead, the node only outputs data.
*   **Code Verification:** Checked `frontend/src/workflow/nodeRegistry.ts`. `find_image` definition lacks `handleConfig`.
*   **Q1 (Know what node does?):** Yes. Finds an image.
*   **Q2 (Know next step?):** No. Confused why there is no "Found" path to connect.
*   **Q3 (Know failure cause?):** N/A.

### Step 2: Add "If Condition" Node (Check A)
*   **Action:** User realizes they need a logic node and adds "If Condition".
*   **Inputs:** Needs to check if Button A was found.
*   **Friction (High):** The user must manually write an expression to reference the previous node's output.
    *   Field: `Value 1`
    *   Required Input: `{{ $nodes["Find Image"].output.found }}`.
    *   This breaks the "No-Code" promise.
*   **Q1 (Know what node does?):** Yes. Logic branching.
*   **Q2 (Know next step?):** Yes. It has explicit "True" and "False" output handles.
*   **Q3 (Know failure cause?):** No. If the expression has a typo or the node name changes, it will fail silently or error at runtime.

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
*   **Friction:** The new node is automatically named "Find Image 1".
*   **Q1:** Yes.
*   **Q2:** No (same issue as Step 1).
*   **Q3:** N/A.

### Step 5: Add "If Condition" Node (Check B)
*   **Action:** Adds another "If Condition" to check Button B.
*   **Inputs:** `Value 1`: `{{ $nodes["Find Image 1"].output.found }}`.
*   **Friction:** Variable reference complexity increases. User must track which "Find Image" node they are referencing.
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
    *   **Consequence:** Requires an explicit `If Condition` node for every check, doubling the node count.
    *   **Backend Verification:** `server/workflow/engine.go`'s `createBridgeExecutor` hardcodes `singleOutput("success", ...)` regardless of finding result.

2.  **Expression Complexity:**
    *   Users must write `{{ $nodes["NodeName"].output.param }}`.
    *   **Consequence:** High barrier to entry. Fails "Script Equivalence" (harder than script).

## Conclusion

The current workflow implementation **fails** the "No-Code Friendly" requirement. While technically equivalent (Turing complete?), the UX friction is too high.
