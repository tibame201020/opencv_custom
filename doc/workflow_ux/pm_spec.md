# PM Specification: Workflow Script Equivalence

**Goal:** Ensure "Script Equivalence" for No-Code Users.
**Scope:** `Find Image` and `Wait Image` nodes.
**Status:** Draft
**Date:** 2025-05-24

## 1. Problem Statement

Current workflow requires users to manually add `If Condition` nodes and write complex expressions (e.g., `{{ $nodes["Find Image"].output.found }}`) to perform basic conditional logic (e.g., "If found, click"). This contradicts the "No-Code" promise and is significantly harder than writing the equivalent Python script (`if find_image(...): ...`).

## 2. Requirements

### Req 1: Intrinsic Branching for Vision Nodes
**Description:** `Find Image` and `Wait Image` nodes MUST support intrinsic branching based on the search result.
**Acceptance Criteria:**
1.  The node displays two output handles: `Found` (True) and `Not Found` (False).
2.  If the image is found, execution proceeds *only* through the `Found` path.
3.  If the image is not found, execution proceeds *only* through the `Not Found` path.
4.  The default behavior (if no specific handle connected) should remain compatible (e.g., if only one output is used, it acts as "Done"). *Correction for MVC:* We will implement explicit handles. If a user connects `Found` to A and `Not Found` to B, the engine respects it.

### Req 2: Visual Feedback
**Description:** The editor must clearly distinguish the paths.
**Acceptance Criteria:**
1.  Handles are labeled "Found" and "Not Found" (or True/False).
2.  Execution logs should clearly indicate which path was taken.

## 3. Out of Scope (for this iteration)
*   **Variable Picker:** Improving the expression builder is a separate task.
*   **Click Node implicit target:** Passing coordinates without expressions is desirable but lower priority than basic flow control.

## 4. Technical Constraints
*   Must work with existing `PythonBridge` structure.
*   Must be implemented in `feature/virtual-workflow`.
*   Changes must be verified in both Backend (Go) and Frontend (React).

## 5. Success Metrics
*   **Node Count Reduction:** A simple "Find -> Click else Log" flow should reduce from 5 nodes (Find, If, Click, If, Log) to 3 nodes (Find, Click, Log).
*   **Expression Elimination:** Users should not need to write `{{ ...found }}` for basic flow.
