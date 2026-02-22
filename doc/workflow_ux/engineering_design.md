# Engineering Design: Workflow UX Optimization

## Objective
Implement **Static Schema Resolution** for the Variable Picker to allow users to reference node outputs (e.g., `found`) before the workflow has executed.

## Involved Files
1.  `frontend/src/components/ExpressionInput.tsx`: Primary logic change.
2.  `frontend/src/workflow/nodeRegistry.ts`: Source of truth for static outputs.

## Implementation Details

### `ExpressionInput.tsx` Refactor

**Current Logic:**
```typescript
const nodeResults = new Map<string, any>();
executionState.forEach(step => {
    nodeResults.set(step.nodeId, step.output);
});
```

**New Logic:**
1.  Import `getNodeDef` from `../workflow/nodeRegistry`.
2.  Iterate over `nodes` (available in props).
3.  For each node:
    *   Check if `executionState` has data.
    *   If **Yes**, use it.
    *   If **No**, fetch `nodeDef` using `node.type`.
    *   Construct a "Static Schema Object" from `nodeDef.outputs`.
        *   Example: `outputs: [{key: 'found'}]` -> `{ found: '(boolean)' }`.
4.  Display these keys in the picker.

### Risks
*   **Dynamic Outputs:** Some nodes (like `Code`) have dynamic outputs that `nodeRegistry` cannot predict. These will remain empty until run.
*   **Schema Drift:** If `nodeRegistry` is outdated compared to Python code, the picker might show wrong keys.

## Verification Plan
1.  **Browser:** Build frontend (`npm run build`). Check for TS errors.
2.  **Runtime:** Start backend/frontend. The change is purely frontend, so backend logic is unaffected.
3.  **Playwright:** The existing test can be updated to *verify the picker contains items*.

## Rollback Strategy
Revert `frontend/src/components/ExpressionInput.tsx` to previous commit.
