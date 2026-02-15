import React, { useEffect, useState, useCallback } from 'react';
// import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import {
    LayoutGrid, Plus, Search, ChevronLeft,
    Save, Play, X, FileEdit, FolderOpen, FolderMinus, FolderPlus
} from 'lucide-react';

import { WorkflowView } from './WorkflowView';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '../utils/toast';
import clsx from 'clsx';

export const WorkflowEditorView: React.FC = () => {
    // const { t } = useTranslation(); // t is unused for now
    const {
        projects, fetchProjects, apiBaseUrl,
        projectSelectedId, setProjectSelectedId,
        workflowSelectedId, setWorkflowSelectedId,
        workflowTabs, activeWorkflowTabId,
        openWorkflowTab, closeWorkflowTab, setActiveWorkflowTab,
        updateWorkflowTabContent, saveWorkflowTab,
    } = useAppStore();

    const [searchTerm, setSearchTerm] = useState('');

    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateWfModalOpen, setIsCreateWfModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newWfName, setNewWfName] = useState('');
    const [deletingWfId, setDeletingWfId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [executionState, setExecutionState] = useState<any[]>([]);

    // Rename Modal State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Delete Confirmation State
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);

    useEffect(() => {
        // No global click listener needed anymore if we don't have custom context menu
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




    // Helper to open workflow tab
    const openWorkflow = useCallback(async (id: string, projectId: string) => {
        const tabId = `wf:${id}`;
        const existing = workflowTabs.find(t => t.id === tabId);
        if (existing) {
            setActiveWorkflowTab(tabId);
            return;
        }

        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${id}`);
            if (res.ok) {
                const data = await res.json();
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
        setExecutionState([]); // Reset visual feedback
        try {
            // Auto-save before running
            console.log("Auto-saving workflow before run:", tab.workflowId);
            const workflowData = JSON.parse(tab.content);
            await fetch(`${apiBaseUrl}/workflows/${tab.workflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowData),
            });
            saveWorkflowTab(activeWorkflowTabId);

            const res = await fetch(`${apiBaseUrl}/workflows/${tab.workflowId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Workflow started", "success");

                // Connect to WebSocket for logs
                if (data.runId) {
                    // Assuming API is proxied, so ws is relative or derived
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    // Use configured API base or derive from location
                    let wsUrl = '';
                    if (apiBaseUrl.startsWith('http')) {
                        const url = new URL(apiBaseUrl);
                        wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws/logs/${data.runId}`;
                    } else {
                        wsUrl = `${wsProtocol}//${window.location.host}/ws/logs/${data.runId}`;
                    }

                    const ws = new WebSocket(wsUrl);
                    ws.onmessage = (event) => {
                        try {
                            const msg = JSON.parse(event.data);

                            // Handle Execution Events
                            if (msg.type === 'execution_step') {
                                setExecutionState(prev => [...prev, msg.data]);
                            }

                            // If execution complete, stop loading
                            if (msg.type === 'status' && (msg.message?.includes('Complete') || msg.message?.includes('exited') || msg.message?.includes('cancelled'))) {
                                setIsRunning(false);
                                ws.close();
                            }
                        } catch (e) {
                            // Ignore raw logs for now
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
            {/* MODE: DASHBOARD (No active tab) */}
            {!activeTab && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100">
                    <div className="flex-none p-8 pb-4 border-b border-base-300 bg-base-100 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Workflows</h1>
                                <p className="text-base-content/50 mt-1">Manage your automation pipelines</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                                    <input
                                        type="text"
                                        placeholder="Search workflows..."
                                        className="input input-bordered pl-10 w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <button
                                    className="btn btn-outline gap-2"
                                    onClick={() => setIsCreateProjectModalOpen(true)}
                                >
                                    <FolderPlus size={18} />
                                    New Project
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Project/Workflow List */}
                    <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
                        {filteredProjects.map(project => (
                            <div key={project.id} className="card bg-base-200/50 shadow-sm border border-base-300">
                                <div className="card-body p-4">
                                    {/* Project Header (Root Folder) */}
                                    <div className="flex items-center justify-between group h-9">
                                        <div className="flex items-center gap-2 select-none cursor-default">
                                            {project.workflows && project.workflows.length > 0 ? (
                                                <FolderOpen size={20} className="text-secondary fill-secondary/20" />
                                            ) : (
                                                <FolderMinus size={20} className="text-secondary fill-secondary/20" />
                                            )}
                                            <h3 className="font-bold text-lg leading-none">{project.name}</h3>
                                            <span className="text-xs opacity-40 ml-2">({project.workflows?.length || 0})</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="btn btn-xs btn-ghost gap-1"
                                                onClick={() => {
                                                    setProjectSelectedId(project.id);
                                                    setIsCreateWfModalOpen(true);
                                                }}
                                            >
                                                <Plus size={14} />
                                                New Workflow
                                            </button>
                                            <button
                                                className="btn btn-xs btn-ghost gap-1"
                                                onClick={() => {
                                                    setRenameTarget({ type: 'project', id: project.id, name: project.name });
                                                    setRenameValue(project.name);
                                                    setIsRenameModalOpen(true);
                                                }}
                                            >
                                                <FileEdit size={14} />
                                                Rename
                                            </button>
                                            <button
                                                className="btn btn-xs btn-ghost gap-1 text-error hover:bg-error/10"
                                                onClick={() => requestDelete('project', project.id, project.name)}
                                            >
                                                <X size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Workflow List (File Tree) */}
                                    <div className="mt-2 pl-2 relative">
                                        {/* Tree guide line */}
                                        <div className="absolute left-[9px] top-0 bottom-4 w-px bg-base-content/10"></div>

                                        <div className="flex flex-col gap-1">
                                            {project.workflows?.map((wf: any) => (
                                                <div
                                                    key={wf.id}
                                                    className="flex items-center justify-between pl-6 py-1.5 pr-2 rounded hover:bg-base-300/50 transition-colors cursor-pointer group relative"
                                                    onClick={() => {
                                                        setProjectSelectedId(project.id);
                                                        openWorkflow(wf.id, project.id);
                                                    }}
                                                >
                                                    {/* Horizontal branch line */}
                                                    <div className="absolute left-[9px] top-1/2 w-4 h-px bg-base-content/10"></div>

                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <LayoutGrid size={16} className="text-primary/70 shrink-0" />
                                                        <span className="truncate text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {wf.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-mono opacity-30 mr-2 hidden sm:inline-block">
                                                            {wf.id.substring(0, 8)}
                                                        </span>
                                                        <button
                                                            className="btn btn-xs btn-ghost btn-square"
                                                            title="Rename"
                                                            onClick={(e) => { e.stopPropagation(); setRenameTarget({ type: 'workflow', id: wf.id, name: wf.name }); setRenameValue(wf.name); setIsRenameModalOpen(true); }}
                                                        >
                                                            <FileEdit size={12} />
                                                        </button>
                                                        <button
                                                            className="btn btn-xs btn-ghost btn-square text-error"
                                                            title="Delete"
                                                            onClick={(e) => { e.stopPropagation(); setDeletingWfId(wf.id); }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {(!project.workflows || project.workflows.length === 0) && (
                                            <div className="pl-6 py-2 text-xs opacity-40 italic relative">
                                                <div className="absolute left-[9px] top-1/2 w-4 h-px bg-base-content/10"></div>
                                                <span className="cursor-pointer hover:underline hover:text-primary" onClick={() => { setProjectSelectedId(project.id); setIsCreateWfModalOpen(true); }}>
                                                    Empty (click to create)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredProjects.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                                    <LayoutGrid size={48} />
                                </div>
                                <h3 className="text-xl font-bold opacity-50">No Projects Found</h3>
                                <p className="mt-2 opacity-30">Get started by creating a new project.</p>
                                <button
                                    className="btn btn-primary mt-6"
                                    onClick={() => setIsCreateProjectModalOpen(true)}
                                >
                                    Create Project
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}



            {/* Main Content Area - Editor (Only if activeTab) */}
            {activeTab && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header Toolbar */}
                    <div className="flex items-center justify-between px-4 h-14 bg-base-100 border-b border-base-300 shrink-0 z-10">
                        <div className="flex items-center gap-4">
                            <button
                                className="btn btn-sm btn-ghost gap-2 text-base-content/60"
                                onClick={() => {
                                    setWorkflowSelectedId(null);
                                    setActiveWorkflowTab('');
                                }}
                            >
                                <ChevronLeft size={16} /> Workflows
                            </button>
                            <div className="h-6 w-px bg-base-300" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg leading-none">{activeTab.name}</span>
                                    {activeTab.isDirty && <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />}
                                </div>
                                <div className="text-[10px] opacity-40 font-bold uppercase tracking-wider leading-none mt-1">
                                    {activeProject?.name || 'Project'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className={clsx("btn btn-sm gap-2", activeTab.isDirty ? "btn-primary" : "btn-ghost")}
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                <Save size={16} />
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                className="btn btn-sm btn-success text-white gap-2 shadow-sm"
                                onClick={handleRun}
                                disabled={isRunning}
                            >
                                {isRunning ? <span className="loading loading-spinner loading-xs" /> : <Play size={16} />}
                                {isRunning ? 'Running' : 'Execute'}
                            </button>
                        </div>
                    </div>

                    {/* Workflow Canvas */}
                    <div className="flex-1 overflow-hidden relative">
                        <WorkflowView
                            key={activeTab.id}
                            tab={activeTab}
                            onContentChange={(content: string) => updateWorkflowTabContent(activeTab.id, content)}
                            onRun={handleRun}
                            isExecuting={isRunning}
                            executionState={executionState}
                        />

                    </div>
                </div>
            )}

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
                        <FileEdit size={20} className="text-primary" /> Rename {renameTarget?.type}
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
        </div>
    );
};
