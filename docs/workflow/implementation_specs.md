# Workflow Engine Implementation Specification

## 1. Scope & Context Management

### Current State
- `GlobalContext` (map[string]interface{}) is flat.
- `Loop` nodes store iteration state in `GlobalContext` (e.g., `loop_<id>_index`).
- `set_variable` modifies the stream (input for next node) or GlobalContext.

### Target Design (n8n-like)
- **Context Stack:** Execution should maintain a stack of Scopes.
- **Scope Structure:**
  ```go
  type Scope struct {
      Variables map[string]interface{}
      Parent    *Scope
  }
  ```
- **Variable Resolution (`$vars`):** Look up in current scope, then parent, up to global.
- **Loop Execution:**
  - On Entry: Push a new Scope. Initialize `index=0`, `item=items[0]`.
  - On Iteration: Update `index`, `item` in current scope.
  - On Exit: Pop Scope.

## 2. Logic Nodes

### Loop Node
- **Inputs:** `items` (Array).
- **Outputs:** `body` (Iterating), `done` (Finished).
- **Behavior:**
  1. Resolve `items`.
  2. If first run (or re-entry), create Iterator in Scope.
  3. If has items:
     - Set `$vars.index`, `$vars.item`.
     - Output to `body`.
  4. If no items or finished:
     - Output to `done`.

### Switch Node
- **Inputs:** `value`, `cases` (Array of values).
- **Outputs:** `0`, `1`, `2`... matching index of `cases`, or `default`.
- **Behavior:**
  1. Resolve `value`.
  2. Iterate `cases`.
  3. If match found, return Signal = Index (string).
  4. Else return Signal = "default".

### If Node
- **Inputs:** `value1`, `operator`, `value2`.
- **Outputs:** `true`, `false`.
- **Behavior:**
  1. Resolve values.
  2. Apply operator.
  3. Return Signal = "true" or "false".

## 3. Visual Feedback (Frontend)

### Execution State
- Backend emits `execution_step` event via WebSocket.
- Frontend (`WorkflowView`) listens and appends to `executionState` array.
- **Edges:**
  - An edge is "active" (Green) if:
    - Source Node ID matches a step in `executionState`.
    - Source Signal matches edge Handle ID (e.g., "true", "0", "body").
    - Target Node matches next step? (Or just source completion is enough for visualization).

### Node Handles
- **Switch:** Dynamic handles based on `config.cases` length.
- **Loop:** Fixed handles: `body`, `done`.
- **If:** Fixed handles: `true`, `false`.

## 4. Backend-Frontend Contract

### WebSocket Events
- `execution_step`:
  ```json
  {
    "type": "execution_step",
    "data": {
      "nodeId": "n1",
      "signal": "true",
      "output": { ... }
    }
  }
  ```

### API
- `POST /workflows/:id/run`: Triggers execution.
- Returns `runId`.
- Client connects `ws/logs/:runId`.

## 5. Device ID Constraint
- **Issue:** `NewPythonBridge` hangs or fails if `deviceId` is empty/missing on Android platform.
- **Fix:** If `deviceId` is empty, default platform to `desktop` (no ADB required) or inject a dummy ID if testing logic only.
