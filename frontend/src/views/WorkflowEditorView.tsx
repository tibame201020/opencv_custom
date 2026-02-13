import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import {
    LayoutGrid, Plus, Search, Trash2, ChevronLeft, ChevronRight,
    Activity, Save, Play, X, Code2, Network
} from 'lucide-react';
import { AssetExplorer } from '../components/AssetExplorer';
import { WorkflowView } from './WorkflowView';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '../utils/toast';
import clsx from 'clsx';

export const WorkflowEditorView: React.FC = () => {
    const { t } = useTranslation();
    const {
        projects, fetchProjects, apiBaseUrl,
        projectSelectedId, setProjectSelectedId,
        workflowSelectedId, setWorkflowSelectedId,
        workflowAssetExplorerCollapsed, setWorkflowAssetExplorerCollapsed,
        workflowSidebarCollapsed, setWorkflowSidebarCollapsed,
        workflowTabs, activeWorkflowTabId,
        openWorkflowTab, closeWorkflowTab, setActiveWorkflowTab,
        updateWorkflowTabContent, updateWorkflowTabViewMode, saveWorkflowTab,
    } = useAppStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateWfModalOpen, setIsCreateWfModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newWfName, setNewWfName] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
    const [deletingWfId, setDeletingWfId] = useState<string | null>(null);
    const [assetExplorerWidth, setAssetExplorerWidth] = useState(250);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [runResult, setRunResult] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        type: 'project' | 'workflow';
        id: string;
        name: string;
    } | null>(null);

    // Rename Modal State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Delete Confirmation State
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);


    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const res = await fetch(`${apiBaseUrl}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName, platform: 'android' })
            });
            if (!res.ok) throw new Error('Failed to create project');
            const data = await res.json();

            setIsCreateProjectModalOpen(false);
            setNewProjectName('');
            await fetchProjects();
            showToast("Project created successfully", "success");
            setProjectSelectedId(data.id);
            setExpandedProjects(prev => ({ ...prev, [data.id]: true }));
        } catch (error) {
            console.error(error);
            showToast("Failed to create project", "error");
        }
    };

    const handleRename = async () => {
        if (!renameTarget || !renameValue.trim()) return;

        try {
            const endpoint = renameTarget.type === 'project'
                ? `${apiBaseUrl}/projects/${renameTarget.id}/rename`
                : `${apiBaseUrl}/workflows/${renameTarget.id}/rename`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameValue })
            });

            if (!res.ok) throw new Error(`Failed to rename ${renameTarget.type}`);

            setIsRenameModalOpen(false);
            setRenameTarget(null);
            setRenameValue('');
            await fetchProjects();
            showToast(`${renameTarget.type === 'project' ? 'Project' : 'Workflow'} renamed successfully`, "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to rename", "error");
        }
    };

    const requestDelete = (type: 'project' | 'workflow', id: string, name: string) => {
        setDeleteTarget({ type, id, name });
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const { type, id } = deleteTarget;

        try {
            const endpoint = type === 'project'
                ? `${apiBaseUrl}/projects/${id}`
                : `${apiBaseUrl}/workflows/${id}`;

            const res = await fetch(endpoint, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Failed to delete ${type}`);

            await fetchProjects();
            showToast(`${type === 'project' ? 'Project' : 'Workflow'} deleted successfully`, "success");

            // Clear selection if deleted
            if (type === 'project' && projectSelectedId === id) setProjectSelectedId(null);

            if (type === 'workflow') {
                const tabId = `wf:${id}`;
                if (workflowTabs.find(t => t.id === tabId)) {
                    closeWorkflowTab(tabId);
                }
                if (workflowSelectedId === id) setWorkflowSelectedId(null);
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to delete", "error");
        } finally {
            setDeleteTarget(null);
        }
    };

    const onContextMenu = (e: React.MouseEvent, type: 'project' | 'workflow', id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type, id, name });
    };

    const openRenameModal = () => {
        if (!contextMenu) return;
        setRenameTarget({ type: contextMenu.type, id: contextMenu.id, name: contextMenu.name });
        setRenameValue(contextMenu.name);
        setIsRenameModalOpen(true);
        setContextMenu(null);
    };

    const triggerDelete = () => {
        if (!contextMenu) return;
        requestDelete(contextMenu.type, contextMenu.id, contextMenu.name);
        setContextMenu(null);
    };



    // Helper to open workflow tab
    const openWorkflow = useCallback(async (id: string, projectId: string) => {
        const tabId = `wf:${id}`;
        const existing = workflowTabs.find(t => t.id === tabId);
        if (existing) {
            console.log(`[Workflow] Tab ${tabId} exists, switching to it.`);
            setActiveWorkflowTab(tabId);
            return;
        }

        console.log(`[Workflow] Fetching workflow ${id}...`);
        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${id}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`[Workflow] Loaded data for ${id}, opening tab.`);
                openWorkflowTab(id, projectId, data.name, JSON.stringify(data, null, 2));
            } else {
                const errText = await res.text();
                console.error(`[Workflow] Failed to load ${id}: ${res.status} ${errText}`);
                showToast(`Failed to load workflow: ${res.statusText || 'Unknown error'}`, "error");
            }
        } catch (err) {
            console.error("[Workflow] Network error:", err);
            showToast("Network error loading workflow", "error");
        }
    }, [workflowTabs, apiBaseUrl, openWorkflowTab, setActiveWorkflowTab]);

    const handleCreateWorkflow = async () => {
        if (!newWfName.trim() || !projectSelectedId) return;
        try {
            const res = await fetch(`${apiBaseUrl}/workflows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: projectSelectedId, name: newWfName })
            });
            if (res.ok) {
                const data = await res.json();
                setIsCreateWfModalOpen(false);
                setNewWfName('');
                await fetchProjects();
                showToast("Workflow created successfully", "success");
                // Select & open tab
                setWorkflowSelectedId(data.id);
                openWorkflow(data.id, projectSelectedId);
            }
        } catch (err) {
            showToast("Failed to create workflow", "error");
        }
    };

    const handleDeleteWorkflow = async (id: string) => {
        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (workflowSelectedId === id) setWorkflowSelectedId(null);
                // Close the tab if open
                const tabId = `wf:${id}`;
                if (workflowTabs.find(t => t.id === tabId)) {
                    closeWorkflowTab(tabId);
                }
                setDeletingWfId(null);
                await fetchProjects();
                showToast("Workflow deleted", "success");
            }
        } catch (err) {
            showToast("Failed to delete", "error");
        }
    };

    const toggleProject = (id: string) => {
        setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
        setProjectSelectedId(id);
    };

    // Auto-open tab for selected workflow (Failsafe for when onClick doesn't trigger or external selection)
    useEffect(() => {
        if (!workflowSelectedId) return;

        // If tab is already open and active, do nothing
        const tabId = `wf:${workflowSelectedId}`;
        if (activeWorkflowTabId === tabId && workflowTabs.some(t => t.id === tabId)) return;

        // Find the project context for this workflow
        const allWorkflows = projects.flatMap(p => (p.workflows || []).map((w: any) => ({ ...w, projectId: p.id })));
        const wf = allWorkflows.find((w: any) => w.id === workflowSelectedId);

        if (wf) {
            openWorkflow(workflowSelectedId, wf.projectId);
        }
    }, [workflowSelectedId, projects, activeWorkflowTabId, workflowTabs, openWorkflow]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (!activeWorkflowTabId) return;
        const tab = workflowTabs.find(t => t.id === activeWorkflowTabId);
        if (!tab) return;
        setIsSaving(true);
        try {
            const data = JSON.parse(tab.content);
            const res = await fetch(`${apiBaseUrl}/workflows/${tab.workflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                saveWorkflowTab(activeWorkflowTabId);
                showToast("Workflow saved", "success");
            } else {
                showToast("Save failed", "error");
            }
        } catch (err) {
            showToast("Save error", "error");
        } finally {
            setIsSaving(false);
        }
    }, [activeWorkflowTabId, workflowTabs, apiBaseUrl, saveWorkflowTab]);

    // Run handler
    const handleRun = useCallback(async () => {
        if (!activeWorkflowTabId) return;
        const tab = workflowTabs.find(t => t.id === activeWorkflowTabId);
        if (!tab) return;
        setIsRunning(true);
        setRunResult(null);
        setLogs([]);
        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${tab.workflowId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                setRunResult(data);
                showToast("Workflow started", "success");

                // Connect to WebSocket for logs
                if (data.runId) {
                    // Assuming API is proxied, so ws is relative or derived
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    // Use configured API base or derive from location
                    // Note: apiBaseUrl might be /api, so we need to construct WS URL
                    // If apiBaseUrl is full URL (http://localhost:12857/api), we need to parse it
                    let wsUrl = '';
                    if (apiBaseUrl.startsWith('http')) {
                        const url = new URL(apiBaseUrl);
                        wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws/logs/${data.runId}`;
                    } else {
                        // Relative
                        wsUrl = `${wsProtocol}//${window.location.host}/ws/logs/${data.runId}`;
                    }

                    const ws = new WebSocket(wsUrl);
                    ws.onmessage = (event) => {
                        try {
                            const msg = JSON.parse(event.data);
                            setLogs(prev => [...prev, msg]);
                            // If execution complete, stop loading
                            if (msg.type === 'status' && (msg.message?.includes('Complete') || msg.message?.includes('exited'))) {
                                setIsRunning(false);
                                ws.close();
                            }
                        } catch (e) {
                            // Plain text log?
                            setLogs(prev => [...prev, { type: 'stdout', message: event.data }]);
                        }
                    };
                    ws.onerror = (e) => {
                        console.error("WS Error", e);
                        setIsRunning(false);
                    };
                    ws.onclose = () => {
                        setIsRunning(false);
                    };
                } else {
                    setIsRunning(false);
                }
            } else {
                showToast(`Run failed: ${data.error || 'Unknown error'}`, "error");
                setIsRunning(false);
            }
        } catch (err) {
            showToast("Execution error", "error");
            setIsRunning(false);
        }
    }, [activeWorkflowTabId, workflowTabs, apiBaseUrl]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    const activeTab = workflowTabs.find(t => t.id === activeWorkflowTabId);
    const activeProject = activeTab ? projects.find(p => p.id === activeTab.projectId) : null;

    // Filter projects by search
    const filteredProjects = searchTerm.trim()
        ? projects.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.workflows || []).some((w: any) => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : projects;

    return (
        <div className="flex h-full w-full bg-base-100 overflow-hidden">
            {/* Column 1: Workflow Sidebar (Project Tree) */}
            <div className={clsx(
                "bg-base-200 border-r border-base-300 flex flex-col transition-all duration-300 ease-in-out shrink-0",
                workflowSidebarCollapsed ? "w-12" : "w-64"
            )}>
                <div className={clsx("p-4 border-b border-base-300 flex items-center bg-base-200/50 shrink-0", workflowSidebarCollapsed ? "justify-center p-2" : "justify-between")}>
                    {workflowSidebarCollapsed ? (
                        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setWorkflowSidebarCollapsed(false)}>
                            <ChevronRight size={20} />
                        </button>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setWorkflowSidebarCollapsed(true)}>
                                <LayoutGrid size={18} className="shrink-0 text-primary" />
                                <h2 className="font-bold text-sm uppercase tracking-wider truncate">{t('ui.workflow.title', 'Workflows')}</h2>
                            </div>
                            <div className="flex gap-1">
                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => setIsCreateProjectModalOpen(true)} title="New Project">
                                    <Plus size={16} />
                                </button>
                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => setWorkflowSidebarCollapsed(true)}>
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {!workflowSidebarCollapsed ? (
                    <>
                        <div className="p-2 shrink-0">
                            <div className="relative mb-2">
                                <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="input input-xs input-bordered pl-8 w-full bg-base-100"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {filteredProjects.map(project => (
                                <div key={project.id} className="space-y-1">
                                    <div
                                        className={clsx(
                                            "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                                            projectSelectedId === project.id ? "bg-primary/10 text-primary" : "hover:bg-base-300"
                                        )}
                                        onClick={() => toggleProject(project.id)}
                                        onContextMenu={(e) => onContextMenu(e, 'project', project.id, project.name)}
                                    >
                                        <ChevronRight
                                            size={14}
                                            className={clsx("transition-transform", expandedProjects[project.id] && "rotate-90")}
                                        />
                                        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold">P</div>
                                        <div className="flex-1 text-[13px] font-bold truncate">{project.name}</div>
                                        {projectSelectedId === project.id && (
                                            <button
                                                className="btn btn-ghost btn-xs btn-square h-5 w-5"
                                                onClick={(e) => { e.stopPropagation(); setIsCreateWfModalOpen(true); }}
                                                title="Add Workflow"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {expandedProjects[project.id] && (
                                        <div className="ml-4 pl-2 border-l border-base-300 space-y-0.5">
                                            {project.workflows?.map((wf: any) => (
                                                <div
                                                    key={wf.id}
                                                    onContextMenu={(e) => onContextMenu(e, 'workflow', wf.id, wf.name)}
                                                    onClick={() => {
                                                        setWorkflowSelectedId(wf.id);
                                                        openWorkflow(wf.id, project.id);
                                                    }}
                                                    className={clsx(
                                                        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all",
                                                        workflowSelectedId === wf.id
                                                            ? "bg-primary text-primary-content"
                                                            : "hover:bg-base-300 text-base-content/60 hover:text-base-content"
                                                    )}
                                                >
                                                    <Activity size={12} />
                                                    <div className="text-[12px] flex-1 truncate">{wf.name}</div>
                                                    <button
                                                        className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 h-4 w-4"
                                                        onClick={(e) => { e.stopPropagation(); setDeletingWfId(wf.id); }}
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!project.workflows || project.workflows.length === 0) && (
                                                <div className="text-[10px] opacity-30 italic py-1 pl-4">Empty</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredProjects.length === 0 && (
                                <div className="text-center py-8 opacity-30 text-xs italic">
                                    No projects found. Create one to start.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center py-4 gap-3 overflow-y-auto scrollbar-hide">
                        {projects.map(p => (
                            <button
                                key={p.id}
                                className={clsx(
                                    "group relative flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                    projectSelectedId === p.id ? "bg-primary/20 text-primary" : "hover:bg-base-300 text-base-content/40"
                                )}
                                onClick={() => toggleProject(p.id)}
                                title={p.name}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Column 2: Asset Explorer (Linked to Project) */}
            <AssetExplorer
                scriptId={projectSelectedId ? `workflow:${projectSelectedId}` : null}
                width={assetExplorerWidth}
                collapsed={workflowAssetExplorerCollapsed}
                onToggle={() => setWorkflowAssetExplorerCollapsed(!workflowAssetExplorerCollapsed)}
                onResize={setAssetExplorerWidth}
            />

            {/* Column 3: Editor Area (Tab Bar + Header + Content) */}
            <div className="flex-1 flex flex-col min-w-0 bg-base-100 relative">
                {/* Tab Bar */}
                {workflowTabs.length > 0 && (
                    <div className="flex items-center bg-base-200/50 border-b border-base-300 h-10 shrink-0 overflow-x-auto custom-scrollbar">
                        {workflowTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveWorkflowTab(tab.id);
                                    setWorkflowSelectedId(tab.workflowId);
                                    setProjectSelectedId(tab.projectId);
                                }}
                                className={clsx(
                                    "group flex items-center gap-2 px-4 h-full border-r border-base-300 text-xs font-medium transition-all whitespace-nowrap shrink-0",
                                    activeWorkflowTabId === tab.id
                                        ? "bg-base-100 text-base-content border-b-2 border-b-primary"
                                        : "bg-base-200/30 text-base-content/50 hover:text-base-content hover:bg-base-100/50"
                                )}
                            >
                                <Activity size={12} className={activeWorkflowTabId === tab.id ? "text-primary" : ""} />
                                <span className="truncate max-w-[120px]">{tab.name}</span>
                                {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                                <span
                                    onClick={(e) => { e.stopPropagation(); closeWorkflowTab(tab.id); }}
                                    className="opacity-0 group-hover:opacity-100 hover:bg-base-300 rounded p-0.5 transition-opacity cursor-pointer"
                                >
                                    <X size={12} />
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Header Toolbar */}
                {activeTab && (
                    <div className="flex items-center justify-between px-4 h-11 bg-base-200/30 border-b border-base-300 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">{activeProject?.name || 'Project'}</span>
                            <span className="text-base-content/20">/</span>
                            <span className="text-sm font-semibold truncate">{activeTab.name}</span>
                            {activeTab.isDirty && <span className="text-warning text-[10px] font-bold">MODIFIED</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View Mode Toggle */}
                            <div className="join border border-base-300">
                                <button
                                    className={clsx("join-item btn btn-xs gap-1", activeTab.viewMode === 'graph' ? "btn-primary" : "btn-ghost")}
                                    onClick={() => updateWorkflowTabViewMode(activeTab.id, 'graph')}
                                    title="Graph View"
                                >
                                    <Network size={12} /> Graph
                                </button>
                                <button
                                    className={clsx("join-item btn btn-xs gap-1", activeTab.viewMode === 'yaml' ? "btn-primary" : "btn-ghost")}
                                    onClick={() => updateWorkflowTabViewMode(activeTab.id, 'yaml')}
                                    title="YAML View"
                                >
                                    <Code2 size={12} /> YAML
                                </button>
                            </div>
                            {/* Save */}
                            <button
                                className={clsx("btn btn-sm btn-ghost gap-1", activeTab.isDirty && "text-warning")}
                                onClick={handleSave}
                                disabled={isSaving || !activeTab.isDirty}
                                title="Save (Ctrl+S)"
                            >
                                <Save size={14} />
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            {/* Run */}
                            <button
                                className="btn btn-sm btn-primary gap-1"
                                onClick={handleRun}
                                disabled={isRunning}
                            >
                                <Play size={14} />
                                {isRunning ? 'Running...' : 'Run'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                {activeTab ? (
                    <div className="flex-1 overflow-hidden relative">
                        <WorkflowView
                            key={activeTab.id}
                            tab={activeTab}
                            onContentChange={(content: string) => updateWorkflowTabContent(activeTab.id, content)}
                            onRun={handleRun}
                            isExecuting={isRunning}
                        />
                        {/* Run Result Panel */}
                        {(runResult || logs.length > 0) && (
                            <div className="absolute bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 p-4 max-h-48 overflow-auto flex flex-col font-mono text-xs shadow-xl z-20">
                                <div className="flex items-center justify-between mb-2 sticky top-0 bg-base-200 pb-2 border-b border-base-300/50">
                                    <span className="text-xs font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-2">
                                        Execution Log
                                        {isRunning && <span className="loading loading-dots loading-xs"></span>}
                                    </span>
                                    <button className="btn btn-xs btn-ghost btn-square" onClick={() => { setRunResult(null); setLogs([]); }}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {logs.map((log, i) => (
                                        <div key={i} className={clsx(
                                            "break-all",
                                            log.level === 'error' || log.type === 'error' ? "text-error" :
                                                log.level === 'warn' ? "text-warning" :
                                                    log.type === 'status' ? "text-info opacity-70" : "text-base-content/70"
                                        )}>
                                            <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                            {typeof log === 'string' ? log : (log.message || JSON.stringify(log))}
                                        </div>
                                    ))}
                                    {logs.length === 0 && runResult && (
                                        <div className="text-success">Started Run ID: {runResult.runId}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-base-content/30 p-12 text-center bg-base-100">
                        <div className="w-24 h-24 bg-base-200 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <LayoutGrid size={48} className="opacity-20 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-base-content/50">Select a Workflow to Edit</h2>
                        <p className="max-w-xs mt-4 text-sm">
                            Choose an existing pipeline from the sidebar or create a new one to start building your visual automation.
                        </p>
                        <button
                            className="btn btn-primary mt-8 gap-2 shadow-lg shadow-primary/20"
                            onClick={() => setIsCreateProjectModalOpen(true)}
                        >
                            <Plus size={18} /> Create New Project
                        </button>
                    </div>
                )}
            </div>

            {/* New Project Modal */}
            <dialog className={clsx("modal", isCreateProjectModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-primary" /> Create New Project
                    </h3>
                    <div className="form-control w-full space-y-4">
                        <div>
                            <label className="label uppercase text-[10px] opacity-50 font-bold">Project Name</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="e.g. Shopping App"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                            />
                        </div>
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsCreateProjectModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateProject}>Create Project</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setIsCreateProjectModalOpen(false)}>close</button>
                </form>
            </dialog>

            {/* New Workflow Modal */}
            <dialog className={clsx("modal", isCreateWfModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-primary" /> Add Workflow to {projects.find(p => p.id === projectSelectedId)?.name}
                    </h3>
                    <div className="form-control w-full space-y-4">
                        <div>
                            <label className="label uppercase text-[10px] opacity-50 font-bold">Workflow Name</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={newWfName}
                                onChange={(e) => setNewWfName(e.target.value)}
                                placeholder="e.g. Login Flow"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                            />
                        </div>
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsCreateWfModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateWorkflow}>Create Workflow</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setIsCreateWfModalOpen(false)}>close</button>
                </form>
            </dialog>

            <ConfirmModal
                isOpen={!!deletingWfId}
                title="Delete Workflow"
                message="Are you sure you want to delete this workflow? This cannot be undone."
                confirmText="Delete"
                type="danger"
                onConfirm={() => deletingWfId && handleDeleteWorkflow(deletingWfId)}
                onCancel={() => setDeletingWfId(null)}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title={`Delete ${deleteTarget?.type === 'project' ? 'Project' : 'Workflow'}`}
                message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.${deleteTarget?.type === 'project' ? ' All workflows within it will also be deleted.' : ''}`}
                confirmText="Delete"
                type="danger"
                onConfirm={executeDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Rename Modal */}
            <dialog className={clsx("modal", isRenameModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Code2 size={20} className="text-primary" /> Rename {renameTarget?.type}
                    </h3>
                    <div className="py-4 space-y-4">
                        <div className="form-control w-full">
                            <label className="label uppercase text-[10px] opacity-50 font-bold">New Name</label>
                            <input
                                type="text"
                                placeholder="Enter name..."
                                className="input input-bordered w-full"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleRename}>Rename</button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setIsRenameModalOpen(false)}>close</button>
                </form>
            </dialog>

            {/* Context Menu */}
            {contextMenu && contextMenu.visible && (
                <div
                    className="fixed z-50 bg-base-100 shadow-xl border border-base-300 rounded-lg py-1 min-w-[150px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <div className="px-3 py-2 border-b border-base-200 text-xs font-bold opacity-50 uppercase tracking-wider">
                        {contextMenu.type}: {contextMenu.name}
                    </div>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                        onClick={openRenameModal}
                    >
                        <Code2 size={14} /> Rename
                    </button>
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-error/10 text-error text-sm flex items-center gap-2"
                        onClick={triggerDelete}
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div >
    );
};
