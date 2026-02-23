# Engineering Design: Intrinsic Branching for Vision Nodes

## 1. Overview
This document outlines the changes required to support intrinsic branching (Found / Not Found paths) for `Find Image` and `Wait Image` nodes, eliminating the need for auxiliary `If Condition` nodes.

## 2. Frontend Changes (`frontend/src/workflow/nodeRegistry.ts`)
We will add `handleConfig` to the `find_image` and `wait_image` node definitions.

### Before:
```typescript
{
    type: 'find_image',
    // ...
    outputs: [ ... ],
}
```

### After:
```typescript
{
    type: 'find_image',
    // ...
    outputs: [ ... ],
    handleConfig: {
        sources: [
            { id: 'true', label: 'Found' },
            { id: 'false', label: 'Not Found' },
        ],
    },
}
```
*(Same for `wait_image`)*

## 3. Backend Changes (`server/workflow/engine.go`)
We will modify the `createBridgeExecutor` function to inspect the execution result and route flow based on the `found` property.

### Current Logic:
Always returns `singleOutput("success", resultItems)`.

### New Logic:
1.  Initialize `outputs` map.
2.  Iterate over input items.
3.  Execute bridge call.
4.  Determine `signal`:
    *   Default: `"success"`
    *   If `nodeType` is `find_image` or `wait_image`:
        *   Check `newItem.JSON["found"]`.
        *   If `true` -> set signal `"true"`.
        *   If `false` -> set signal `"false"`.
5.  Append item to `outputs[signal]`.
6.  Return `NodeOutput{ Outputs: outputs }`.

## 4. Risks & Mitigations
*   **Backward Compatibility:** Existing `find_image` nodes in saved workflows might rely on the implicit "success" output.
    *   *Risk:* High for existing users (if any).
    *   *Mitigation:* For this task (verification/optimization), we accept the breaking change. Alternatively, we could emit to "success" as a fallback if no "true"/"false" edges exist, but the engine doesn't know about edges easily inside the executor.
    *   *Decision:* Implement clean "true"/"false" signals.

## 5. Verification Plan
1.  **Unit Test:** `server/workflow/branching_test.go` mocking the bridge.
2.  **Manual Verification:** Create a workflow with the new structure and verify execution logs.
