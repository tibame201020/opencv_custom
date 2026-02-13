# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed — 2026-02-13 (V2 UI Overhaul)
- **Frontend / Workflow Editor**: Refactored `GenericNode` to 64x64px square shape with rounded corners (n8n V2 style).
- **Frontend / Workflow Editor**: Moved node labels and descriptions outside and below the node container with transparent backgrounds.
- **Frontend / Workflow Editor**: Implemented transparent, floating hover toolbar for node actions (Execute, Disable, Delete).
- **Frontend / Workflow Editor**: Adjusted connection stubs (`+` button) to align correctly with the new square node geometry.
- **Frontend / Workflow Editor**: Replaced context menu node addition with a sliding `WorkflowSidebar` triggered by connection stubs or empty state.
- **Frontend / Workflow Editor**: Updated edge styling to use Bezier curves (`getBezierPath`) for smoother connections.

### Added — 2026-02-13
- **Frontend / Workflow Editor**: n8n-style Floating Action Bar (FAB) with Zoom/Fit controls.
- **Frontend / Workflow Editor**: "Add first step" center button for empty workflows.
- **Frontend / Workflow Editor**: Unified Node Picker (Quick Add Menu) triggerable from FAB, center button, and context menu.

### Added — 2026-02-12
- **Workflow Engine (Backend)**: Implemented Global Context and Node Results management.
- **Workflow Engine (Backend)**: Added `set_variable` executor and enhanced `if_condition` with 55 operators.
- **Workflow Engine (Backend)**: Implemented Expression Support `{{ ... }}` for node configurations.
- **Frontend / Workflow Editor**: Added `Set Variables` node with JSON editor (`Monaco Editor`).
- **Frontend / Workflow Editor**: Implemented Expression Mode toggle for all node parameters.
- **Frontend / Workflow Editor**: Context menus for nodes (Properties, Duplicate, Bring to Front, Send to Back, Delete), edges (Delete), and canvas.
- **Frontend / Workflow Editor**: Node resizing via `NodeResizer` with circular resize handles.
- **Frontend / Workflow Editor**: Box selection (`selectionOnDrag`), scroll panning, right-click panning.
- **Frontend / Workflow Editor**: Z-Index layer control (Bring to Front / Send to Back).
- **Frontend / Workflow Editor**: Keyboard shortcuts — Copy (`Ctrl+C`), Paste (`Ctrl+V`), Duplicate (`Ctrl+D`), Select All (`Ctrl+A`), Delete (`Del/Backspace`).
- **Frontend / Workflow Editor**: Edge interaction — `smoothstep` routing, selectable, updatable endpoints, `interactionWidth: 20`.
- **Frontend / Workflow Editor**: Properties panel behavior changed — single-click selects, double-click or context menu opens panel.
- **Frontend / Workflow Editor**: Selected node styling changed to dashed primary border (no outer ring).

### Added — 2026-02-11
- **Frontend / Workflow Editor**: Layout refactored to IDE-style dual-layer sidebar with tabbed workflow management.
- **Frontend / Workflow Editor**: Node palette with categorized drag-and-drop (Platform / Vision / Flow).
- **Frontend / Workflow Editor**: Node Registry (`nodeRegistry.ts`) for centralized node type definitions.
- **Frontend / Workflow Editor**: Typed properties panel (`ParamField`) with expression mode toggle.
- **Frontend / Workflow Editor**: Variables management panel (CRUD) in collapsible right sidebar.

### Added — 2026-02-10
- **Frontend / Workflow**: Initial visual DAG editor using `@xyflow/react`.
- **Frontend / Workflow**: Workflow state management integrated into Zustand store.
- **Frontend / Workflow**: Navigation and routing for Workflow view.

### Added — 2026-02-09
- **Workflow Engine**: Added `Signal` field to `ExecutionResult` to support better flow control.
- **Workflow Engine**: Added `convert` node type for explicit data transformation.
- **Workflow Engine**: Implemented sub-workflow signal propagation (sub-workflows now return their actual terminal signal instead of hardcoded "success").
- **Workflow Engine**: Workflow persistence via SQLite (CRUD API).
- **Tests**: Added comprehensive test suite for workflow patterns (WhileLoop, ForLoop, ForEach, CaseWhen, NestedSubflow).

### Changed — 2026-02-09
- **Workflow Engine**: Refactored `loop` node to be a pass-through node; loop logic is now composed via Graph (If + Back-edge) instead of internal counters.

### Fixed — 2026-02-11
- **Backend**: Fixed Node Discovery API 500 error — Python command execution and output parsing.

### Fixed — 2026-02-09
- **Python CLI**: Fixed `UnicodeDecodeError` on Windows when running `python core/entry.py` caused by CP950 encoding. Enforced UTF-8 encoding in `test_entry_cli.py`.
