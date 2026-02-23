# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed — 2026-02-23 (Workflow Canvas UI Polish)
- **Frontend / Workflow Canvas**: Comprehensive Node UI Refinement — Titles scaled down to `12px`, subtitles to `9px`, added fine-grained drop shadows (`shadow-sm` and `border-gray-200`) and JSON stringify protection against `[object Object]` rendering errors.
- **Frontend / Workflow Canvas**: Status Indicators (`Success Checkmark`, `Running Loader`) redesigned — Scaled down to 14px badges with backdrop-blur, meticulously positioned at the icon corners to avoid visual dominance.
- **Frontend / Workflow Canvas**: Edge & Edge Label Refinement — Removed high-color-saturation background blocks from branch labels (`true`/`false`), opting for subtle `backdrop-blur-sm` and pastel text colors; label text sizes reduced to `9px`.
- **Frontend / Workflow Canvas**: Global Control Panel Optimization — Replaced the bulky, high-saturation "Execute Workflow" button with an elegant outline primary-style button (`text-emerald-500`); minimized typography and whitespace in the Execution Inspector and added border-radius/shadow to the MiniMap.
- **Frontend / Workflow Canvas**: Node toolbar refined — size reduced, translucent backdrop added, unused 'Execute Step' and 'More Actions' buttons removed.
- **Frontend / Workflow Canvas**: New "Triggers" node category added to the top of the node sidebar. `manual_trigger` moved to this category.
- **Frontend / Workflow Canvas**: Breadcrumb now shows `ProjectName / WorkflowName` format instead of just workflow name; clicking project name navigates back to workflow list.
- **Frontend / Workflow Canvas**: Removed non-functional "Personal" breadcrumb and "Editor/Executions" tab toggle.
- **Frontend / Workflow Canvas**: Added device list refresh button (`RefreshCw`) next to device selector.
- **Frontend / Workflow Canvas**: Unified input/output handle sizes to `w-2.5` (10px) for consistent proportions with 42px node.
- **Frontend / Workflow Canvas**: Fixed edge line alignment — hidden React Flow Handle repositioned from full-fill to centered 2px point with 3px gap offset, ensuring edges start/end precisely at handle dot edges instead of overlapping.
- **Frontend / Workflow Canvas**: Reduced edge stroke width (2→1, hover 3→1.5) and arrow marker size (20→12) for cleaner visual appearance.
- **Backend / Engine**: Implemented `Disabled` node logic — engine now properly paths execution flow through disabled nodes without executing their logic (pass-through).
- **Backend / DB**: Added `disabled` column to `nodes` table and synced state correctly.
- **Documentation**: Established a new hierarchical documentation system (`docs/`) with a central index (`doc-categories.md`). Includes core contribution rules and detailed module guides (`backend_engine.md`, `frontend_canvas.md`, `node_development.md`, `python_bridge.md`, `schema_and_migration.md`, `api_and_store.md`).
- **Test Suite Enhancements**:
    - Fixed race condition in Go backend `integration_test.go` by adding a short delay for WebSocket initialization.
    - Implemented `sanitizeRelPath` in `server.go` to solve absolute path injection issues on Windows.
    - Simplified `run_tests.ps1` by disabling Playwright E2E tests for faster CI/CD cycles.
### Removed — 2026-02-23 (Cleanup Milestone)
- **Project**: Conducted comprehensive "noise file" cleanup (Phase 1, 2, 3, & 4).
  - Removed all design-related documentation directories (`design_docs/`, `design_process/`, `doc/`) and specifications (`N8N_UI_SPEC_V3.md`) to minimize development noise.
  - **Exception**: Preserved `docs/index.html` for GitHub Pages integration while removing other obsolete files in that directory.
  - Cleaned up unused screenshots and verification images across the repository.
  - **Git Tracking**: Untracked and removed accidentally committed build/test artifacts: `frontend/allure-results/`, `frontend/package.json.md5`, `server/backend/test_output.txt`, and temporary `workflows.db`.
  - Removed duplicate documentation in `frontend/doc/`.
  - Removed unused test assets in `core/assets/` and legacy Java PoC files.
  - Removed multiple unmanaged binary outputs (`script-platform.exe`, `server.exe`, etc.) and local test databases (`workflows.db`).
- **Security**: Strengthened `.gitignore` to prevent future accidental commits of binary builds, logs, test reports, and local databases.


### Added — 2026-02-22 (Smart Edge Routing & Visual Fixes)
- **Frontend / Workflow Canvas**: Implemented N8n-style "Smart Edge Routing" which calculates distance dynamically to transition from default Bezier curves to Orthogonal SmoothStep routing when jumping long distances vertically or backwards horizontally.
- **Frontend / Workflow Canvas**: Separated edge rendering calculation into dedicated independent reactive effects (`useEffect`) so that real-time node state and outputs immediately trigger color updates.
- **Tests (Python Core)**: Fixed Python test assertions to check for modern Dictionary schema (`success`/`similarity` keys) instead of legacy Tuple bindings.

### Fixed — 2026-02-22
- **Frontend / Workflow Editor**: Removed experimental global Edge Routing toggle menu favoring the new adaptive Smart Edge algorithm instead.
- **Frontend / Workflow Canvas**: Fixed "Marching Ants" edge animations persisting indiscriminately; animations now only apply contextually to edges when their explicit target node `status === running`.
- **Frontend / Workflow Canvas**: Fixed 0-output nodes (e.g. Sleep, Click) rendering with frozen grey lines despite successful execution by evaluating explicit `targetNode.status` and `sourceNode.signal` alignment.

### Added — 2026-02-22 (Bridge Integration Milestone)
- **Workflow Bridge**: Successfully verified full End-to-End integration of **Go Engine ↔ Python Bridge ↔ ADB ↔ OpenCV**.
- **Workflow Bridge**: Improved console output to show node names, parameters (images, text, coords), and execution results (similarity scores).
- **Workflow Bridge**: Implemented global `stdout` to `stderr` redirection in Python bridge to prevent JSON protocol corruption from internal print statements.
- **Workflow Bridge**: Forced `UTF-8` encoding on Python `stdin`/`stderr` streams to resolve `cp950` codec crashes and garbled Chinese filenames on Windows.

### Fixed — 2026-02-22
- **Workflow Bridge**: Resolved project directory naming mismatch by using `ProjectID` directly for `projectRoot` construction in the Go backend.
- **Workflow Bridge**: Added automatic logical fallback to `images/` subfolder in `PlatformService` when resolving relative asset paths.

### Changed — 2026-02-22 (Edge Routing Strategy)
- **Frontend / Workflow Canvas**: Enforced strict n8n-style edge routing strategy within `HoverEdge`.
  - Forward flow: Bezier S-curve.
  - Backward/Vertical flow: SmoothStep (Orthogonal).
  - **Note**: This strategy is now locked and should not be changed (`DO NOT CHANGE`).

### Added
- **Docs**: Added `doc/go_python_integration.md` documenting the Go-Python bridge architecture and protocol.
- **Tests**: Added headless integration tests for Go-Python communication (`server/workflow/bridge_integration_test.go`).
- **Tests**: Added React-Go-Python verification tests (`server/backend/integration_test.go`).

### Fixed — 2026-02-21 (Execution & UI Fixes)
- **Workflow Engine (Backend)**: Fixed a bug in `createBridgeExecutor` where platform nodes with empty upstream inputs would silently skip execution. They now correctly execute at least once.
- **Frontend / Workflow Editor**: Fixed missing `deviceId` query parameter when triggering workflow execution from the frontend UI (`/api/workflows/:id/run`).

### Added — 2026-02-21 (Node Image Preview)
- **Frontend / Workflow Canvas**: Nodes with `asset` parameters now display a live image thumbnail inside the node box, replacing the default icon.
- **Frontend / Properties Panel**: Asset picker shows actual image preview instead of generic icon after selection.
- **Frontend / Asset Manager**: Subfolder navigation now works correctly in Node Asset Selection mode (single-select).

### Fixed — 2026-02-21
- **Frontend / Workflow Canvas**: Image preview now updates immediately on the canvas when changing an asset parameter (no longer requires save & reload).
- **Frontend / Asset Manager**: Clicking a folder in selection mode navigates into it instead of incorrectly selecting the folder path.

### Added — 2026-02-21 (Workflow Runtime Validation)
- **Tests**: Added `core/test/test_workflow_e2e.py` for headless workflow runtime regression testing.
- **Tests**: Added `core/test/test_opencv_robustness.py` for validating image matching robustness.
- **Tools**: Added `tools/adb_stub` to mock ADB behavior for testing without devices.
- **Docs**: Added `doc/workflow_runtime_audit.md` documenting runtime architecture and risks.
- **Core**: Updated `core/service/platform/adb/adb.py` to support `ADB_BIN` injection for testing.

### Added — 2026-02-21 (Asset Manager Enhancements)
- **Backend / Assets**: Standardized `projectRoot/images` path handling across all asset API operations (list, upload, delete, get, move, copy, rename, mkdir).
- **Backend / Assets**: Strengthened path traversal security checks for CRUD handlers and implemented comprehensive unit tests.
- **Frontend / Asset Manager**: Implemented Folder CRUD UI integration (select, delete, rename folders).
- **Frontend / Asset Manager**: Added Drag-and-Drop functionality allowing assets to be moved into subfolders.

### Changed — 2026-02-13 (V2 UI Overhaul)
- **Frontend / Workflow Editor**: Refactored `GenericNode` to 64x64px square shape with rounded corners (n8n V2 style).
- **Frontend / Workflow Editor**: Moved node labels and descriptions outside and below the node container with transparent backgrounds.
- **Frontend / Workflow Editor**: Implemented transparent, floating hover toolbar for node actions (Execute, Disable, Delete).
- **Frontend / Workflow Editor**: Adjusted connection stubs (`+` button) to align correctly with the new square node geometry.
- **Frontend / Workflow Editor**: Replaced context menu node addition with a sliding `WorkflowSidebar` triggered by connection stubs or empty state.
- **Frontend / Workflow Editor**: Updated edge styling to use Bezier curves (`getBezierPath`) for smoother connections.

### Changed — 2026-02-15 (Handle Interaction)
- **Frontend / Workflow Editor**: Refactored Node Handles to fully match n8n behavior.
- **Frontend / Workflow Editor**: Implemented **Left-Click** on `+` stub to open "Quick Add" menu (fixed Right-Click issue).
- **Frontend / Workflow Editor**: Implemented **Left-Drag** from `+` stub to create connections (wire originates from dot).
- **Frontend / Workflow Editor**: Added `nodrag` to stub to prevent unintended node movement.
- **Frontend / Workflow Editor**: Fixed stub visibility to automatically hide when dragging or connected.

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

### Changed — 2026-02-16
- **Frontend / Workflow Editor**: Removed YAML/Code View conversion logic (`viewMode`) to enforce a strict low-code environment.
- **Frontend / Workflow Editor**: Removed `Monaco Editor` from Workflow View; node outputs are now displayed in read-only JSON blocks.
- **Frontend / Workflow Editor**: Consolidated parameter inputs to use `textarea` for JSON editing instead of full code editor.

### Fixed — 2026-02-16
- **Backend**: Fixed `Code` node execution failure by ensuring Python bridge is initialized when a Code node is present.
- **Frontend / Workflow Editor**: Implemented missing keyboard shortcuts: Select All (`Ctrl+A`), Copy (`Ctrl+C`), Paste (`Ctrl+V`), and Duplicate (`Ctrl+D`).

### Added — 2026-02-16 (Project Asset Management)
- **Backend / Project**: Implemented Project Asset API (`/projects/:id/assets`) for Upload, List, Delete, and Serve.
- **Frontend / Project**: Added `Asset Manager` modal (Fixed preview and upload issues caused by Wails WebView2 FormData stripping bug).
- **Frontend / Workflow Editor**: Integrated `Asset Selector` for `click_image` nodes.

### Fixed — 2026-02-11
- **Backend**: Fixed Node Discovery API 500 error — Python command execution and output parsing.

### Fixed — 2026-02-09
- **Python CLI**: Fixed `UnicodeDecodeError` on Windows when running `python core/entry.py` caused by CP950 encoding. Enforced UTF-8 encoding in `test_entry_cli.py`.
