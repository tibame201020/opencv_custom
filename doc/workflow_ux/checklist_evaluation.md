# 10-Item Checklist Evaluation

## 1. 條件分支能力 (Conditional Branching)
*   **Engine (Level A):** **Yes.** `If Condition` and `Switch` nodes exist and route data to specific outputs (`true`/`false` or case indices).
*   **User UX (Level B):** **Yes.** Handles are clearly labeled "True" and "False".
*   **Evidence:** `nodeRegistry.ts` defines `if_condition` with multiple sources. `N8nNode.tsx` renders labels.

## 2. 巢狀邏輯能力 (Nested Logic)
*   **Engine (Level A):** **Yes.** Graph-based execution allows arbitrary depth.
*   **User UX (Level B):** **Yes.** Users can chain If nodes.
*   **Evidence:** `FlowEngine` uses BFS/Queue which supports deep graphs.

## 3. 變數與狀態管理 (Variables & State)
*   **Engine (Level A):** **Yes.** Global context (`$vars`) and Node output (`$node`) are passed in `NodeArg`.
*   **User UX (Level B):** **Improved.** Before fix: No. After fix: **Yes**. Static schema resolution allows discovering variable paths like `$node["Find Image"].output.found` without running first.
*   **Evidence:** `ExpressionInput.tsx` refactor.

## 4. 錯誤路徑處理 (Error Handling)
*   **Engine (Level A):** **Partial.** Nodes return `{ success: false }` or throw. The engine catches errors but doesn't strictly support a dedicated "Error" output handle for *every* node unless defined.
*   **User UX (Level B):** **No.** Users cannot drag an "Error" wire from a generic "Click" node to handle a crash.
*   **Evidence:** `executors_builtin.go` returns `success` or `error` signal, but `nodeRegistry.ts` only defines `success` output for most nodes.
*   **Risk:** High. Exceptions might stop flow abruptly.

## 5. 可視化流程追蹤 (Visual Tracing)
*   **Engine (Level A):** **Yes.** WebSocket streams `execution_step` events.
*   **User UX (Level B):** **Yes.** Edges light up (Blue/Green/Red). Inspector shows step details.
*   **Evidence:** `WorkflowView.tsx` logic for `edgesWithData`.

## 6. Retry 與 Loop 能力 (Retry & Loop)
*   **Engine (Level A):** **Yes (Loop) / No (Retry).** `Loop` node exists. Built-in Retry policy per node is missing in `WorkflowNode` struct.
*   **User UX (Level B):** **Mixed.** Loops are explicit nodes. Retries are manual (loops).
*   **Evidence:** `executors_builtin.go` has `createLoopExecutor`. No `retry` config in `WorkflowNode`.

## 7. Debug 能力 (Debugging)
*   **Engine (Level A):** **Yes.** Full input/output JSON is recorded.
*   **User UX (Level B):** **Yes.** Execution Inspector panel shows JSON data.
*   **Evidence:** `ExecutionInspector.tsx`.

## 8. 心智模型一致性 (Mental Model)
*   **Engine (Level A):** **Yes.** n8n-like "Item" based processing.
*   **User UX (Level B):** **Yes.** Drag-and-drop, Left-to-Right flow.
*   **Evidence:** UI mimics n8n.

## 9. 可維護性 (Maintainability)
*   **Engine (Level A):** **Yes.** JSON-based storage.
*   **User UX (Level B):** **Yes.** Nodes can be moved, renamed, rewired.
*   **Evidence:** ReactFlow integration.

## 10. 錯誤可預測性 (Error Predictability)
*   **Engine (Level A):** **Mixed.** Python bridge errors are captured as string messages.
*   **User UX (Level B):** **Mixed.** "Find Image" failure behavior (return false vs throw) depends on implementation details not always visible in UI.
*   **Evidence:** `server/workflow/executors_builtin.go` handles bridge errors but converts them to JSON error fields or stops execution.

---

## Final Assessment
The Virtual Workflow system is **Script Equivalent** for happy paths and controlled logic.
**Major Gaps:**
1.  **Error Wiring:** Lack of "On Error" continue/path for standard nodes.
2.  **Retry Policy:** No native retry configuration.

**UX Status:** Significantly improved by Phase 3 (Static Schema), making the "Script Equivalent Task" achievable for a No-Code user.
