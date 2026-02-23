import React, { useEffect, useState, useCallback } from 'react';
// import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import {
    Smartphone, LayoutGrid, Plus, Search, ChevronLeft,
    Save, X, FileEdit, FolderOpen, FolderMinus, FolderPlus, RefreshCw
} from 'lucide-react';

import { WorkflowView } from './WorkflowView';
import { ConfirmModal } from '../components/ConfirmModal';
import { AssetManagerModal } from '../components/AssetManagerModal';
import { showToast } from '../utils/toast';
import clsx from 'clsx';

export const WorkflowEditorView: React.FC = () => {
    // const { t } = useTranslation(); // t is unused for now
    const {
        projects, fetchProjects, apiBaseUrl, devices, fetchDevices,
        projectSelectedId, setProjectSelectedId,
        workflowSelectedId, setWorkflowSelectedId,
        workflowTabs, activeWorkflowTabId,
        openWorkflowTab, closeWorkflowTab, setActiveWorkflowTab,
        updateWorkflowTabContent, saveWorkflowTab
    } = useAppStore();

    const [searchTerm, setSearchTerm] = useState('');

    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateWfModalOpen, setIsCreateWfModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newWfName, setNewWfName] = useState('');
    const [deletingWfId, setDeletingWfId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [executionState, setExecutionState] = useState<any[]>([]);

    // Device Selection
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

    const handleRefreshDevices = async () => {
        if (isRefreshingDevices) return;
        setIsRefreshingDevices(true);
        try {
            await fetchDevices();
        } finally {
            setIsRefreshingDevices(false);
        }
    };

    // Rename Modal State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Delete Confirmation State
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);

    // Asset Manager State
    const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
    const [assetManagerProject, setAssetManagerProject] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        // No global click listener needed anymore if we don't have custom context menu
    }, []);

    // Init selected device
    useEffect(() => {
        if (!selectedDevice && devices.length > 0) {
            setSelectedDevice(devices[0]);
        }
    }, [devices, selectedDevice]);


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
        const existing = useAppStore.getState().workflowTabs.find(t => t.id === tabId);
        if (existing) {
            setActiveWorkflowTab(tabId);
            return;
        }

        // Try to find name from local projects list first to avoid extra fetch
        let name = 'Workflow';
        const project = projects.find(p => p.id === projectId);
        if (project && project.workflows) {
            const wf = project.workflows.find((w: any) => w.id === id);
            if (wf) name = wf.name;
        }

        // Open with empty content, WorkflowViewInner will fetch on mount
        openWorkflowTab(id, projectId, name, '{}');
    }, [projects, openWorkflowTab, setActiveWorkflowTab]);

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
        const currentActive = useAppStore.getState().activeWorkflowTabId;
        if (currentActive === tabId) return;

        // Find the project context for this workflow
        const allWorkflows = projects.flatMap(p => (p.workflows || []).map((w: any) => ({ ...w, projectId: p.id })));
        const wf = allWorkflows.find((w: any) => w.id === workflowSelectedId);

        if (wf) {
            openWorkflow(workflowSelectedId, wf.projectId);
        }
    }, [workflowSelectedId, projects, openWorkflow]);

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

    const handleRun = useCallback(async () => {
        if (!activeWorkflowTabId) return;
        const tab = workflowTabs.find(t => t.id === activeWorkflowTabId);
        if (!tab) return;

        if (!selectedDevice) {
            showToast("Please select a device first", "error");
            return;
        }

        setIsRunning(true);
        setExecutionState([]); // Reset visual feedback
        useAppStore.getState().setWorkflowExecutionPath(activeWorkflowTabId, []); // Clear frontend paths
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

            // Pass deviceId query param
            const res = await fetch(`${apiBaseUrl}/workflows/${tab.workflowId}/run?deviceId=${encodeURIComponent(selectedDevice)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Workflow started", "success");
                setActiveRunId(data.runId);

                // Connect to WebSocket for logs
                if (data.runId) {
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
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
                            if (msg.type === 'execution_step') {
                                setExecutionState(prev => {
                                    const next = [...prev];
                                    const existingIndex = next.findIndex(s => s.nodeId === msg.data.nodeId);
                                    if (existingIndex !== -1) {
                                        next[existingIndex] = { ...next[existingIndex], ...msg.data };
                                    } else {
                                        next.push(msg.data);
                                    }
                                    return next;
                                });
                            }
                            if (msg.type === 'status' && (msg.message?.includes('Complete') || msg.message?.includes('exited') || msg.message?.includes('cancelled'))) {
                                setIsRunning(false);
                                setActiveRunId(null);
                                ws.close();
                            }
                            // Capture the final execution result payload which has the `ExecutionPath`
                            if (msg.type === 'execution_result' && msg.data?.executionPath) {
                                useAppStore.getState().setWorkflowExecutionPath(activeWorkflowTabId, msg.data.executionPath);
                            }
                        } catch (e) { }
                    };
                    ws.onerror = (e) => {
                        console.error("WS Error", e);
                        setIsRunning(false);
                    };
                    ws.onclose = () => {
                        setIsRunning(false);
                        setActiveRunId(null);
                    };
                }
            } else {
                showToast(`Run failed: ${data.error || 'Unknown error'}`, "error");
                setIsRunning(false);
            }
        } catch (err) {
            showToast("Execution error", "error");
            setIsRunning(false);
            setActiveRunId(null);
        }
    }, [activeWorkflowTabId, workflowTabs, apiBaseUrl, selectedDevice, handleSave, saveWorkflowTab]);

    const handleStop = useCallback(async () => {
        if (!activeRunId) return;
        try {
            const res = await fetch(`${apiBaseUrl}/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runId: activeRunId }),
            });
            if (res.ok) {
                showToast("Stop signal sent", "success");
            } else {
                showToast("Failed to stop", "error");
            }
        } catch (err) {
            showToast("Stop error", "error");
        }
    }, [activeRunId, apiBaseUrl]);

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
                                    className="btn btn-primary gap-2 shadow-md hover:shadow-lg transition-all"
                                    onClick={() => setIsCreateProjectModalOpen(true)}
                                >
                                    <FolderPlus size={18} />
                                    New Project
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Project/Workflow List */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-slate-50/50">
                        {filteredProjects.map(project => (
                            <div key={project.id} className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] border border-gray-200 overflow-hidden transition-all hover:shadow-md">

                                {/* Project Header (Root Folder) */}
                                <div className="flex items-center justify-between group px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                                    <div className="flex items-center gap-3 select-none cursor-default">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            {project.workflows && project.workflows.length > 0 ? (
                                                <FolderOpen size={18} className="text-primary" />
                                            ) : (
                                                <FolderMinus size={18} className="text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[15px] text-gray-800 leading-tight">{project.name}</h3>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{project.workflows?.length || 0} workflows</p>
                                        </div>
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
                                                setAssetManagerProject({ id: project.id, name: project.name });
                                                setIsAssetManagerOpen(true);
                                            }}
                                        >
                                            <FolderOpen size={14} /> // Reusing or using ImageIcon
                                            Assets
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

                                {/* Workflow List */}
                                <div className="flex flex-col p-2">
                                    {project.workflows?.map((wf: any) => (
                                        <div
                                            key={wf.id}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                                            onClick={() => {
                                                setProjectSelectedId(project.id);
                                                openWorkflow(wf.id, project.id);
                                            }}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                                    <LayoutGrid size={14} className="opacity-70 group-hover:opacity-100" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate text-[13px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                                        {wf.name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-gray-400 mt-0.5">
                                                        ID: {wf.id.substring(0, 8)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="btn btn-xs btn-ghost btn-square hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
                                                    title="Rename"
                                                    onClick={(e) => { e.stopPropagation(); setRenameTarget({ type: 'workflow', id: wf.id, name: wf.name }); setRenameValue(wf.name); setIsRenameModalOpen(true); }}
                                                >
                                                    <FileEdit size={14} className="text-gray-500" />
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-ghost btn-square hover:bg-rose-50 hover:shadow-sm border border-transparent hover:border-rose-200 text-rose-500"
                                                    title="Delete"
                                                    onClick={(e) => { e.stopPropagation(); setDeletingWfId(wf.id); }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(!project.workflows || project.workflows.length === 0) && (
                                        <div className="flex items-center justify-center py-6 px-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 mt-2 mx-2 mb-2">
                                            <span className="text-[13px] text-gray-400 cursor-pointer hover:text-primary transition-colors flex items-center gap-2" onClick={() => { setProjectSelectedId(project.id); setIsCreateWfModalOpen(true); }}>
                                                <Plus size={14} /> Create your first workflow securely here
                                            </span>
                                        </div>
                                    )}
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
            {
                activeTab && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header Toolbar */}
                        <div className="relative flex items-center justify-between px-4 h-14 bg-base-100 border-b border-base-300 shrink-0 z-10">
                            {/* Left: Breadcrumbs & Back */}
                            <div className="flex items-center gap-3">
                                <button
                                    className="btn btn-sm btn-ghost btn-square text-base-content/60"
                                    onClick={() => {
                                        setWorkflowSelectedId(null);
                                        setActiveWorkflowTab('');
                                    }}
                                    title="Back to Workflows"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex items-center text-sm font-medium text-base-content/70">
                                    <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                        setWorkflowSelectedId(null);
                                        setActiveWorkflowTab('');
                                    }}>{projects.find(p => p.id === activeTab.projectId)?.name || 'Project'}</span>
                                    <span className="mx-2 opacity-50">/</span>
                                    <div className="flex items-center gap-2 text-base-content font-bold">
                                        <span>{activeTab.name}</span>
                                        {activeTab.isDirty && <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />}
                                    </div>
                                </div>
                            </div>

                            {/* Right Actions */}
                            <div className="flex items-center gap-2">
                                {/* Device Selector */}
                                <div className="flex items-center gap-0 bg-base-200 rounded-lg px-2 h-8">
                                    <Smartphone size={14} className="opacity-50" />
                                    <select
                                        className="select select-xs select-ghost focus:outline-none w-[140px] max-w-[140px] text-xs font-mono"
                                        value={selectedDevice}
                                        onChange={(e) => setSelectedDevice(e.target.value)}
                                        onClick={() => { if (devices.length === 0) fetchDevices(); }}
                                    >
                                        {devices.length === 0 && <option value="" disabled>No devices</option>}
                                        {devices.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn btn-xs btn-ghost btn-square h-6 w-6"
                                        onClick={() => handleRefreshDevices()}
                                        title="Refresh Devices"
                                    >
                                        <RefreshCw size={12} className={clsx(isRefreshingDevices && "animate-spin")} />
                                    </button>
                                </div>

                                <button
                                    className={clsx("btn btn-sm gap-2", activeTab.isDirty ? "btn-primary" : "btn-ghost")}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    <Save size={16} />
                                    {isSaving ? 'Saving...' : 'Save'}
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
                                onStop={handleStop}
                                isExecuting={isRunning}
                                executionState={executionState}
                            />

                        </div>
                    </div>
                )
            }

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

            {
                assetManagerProject && (
                    <AssetManagerModal
                        isOpen={isAssetManagerOpen}
                        onClose={() => setIsAssetManagerOpen(false)}
                        projectId={assetManagerProject.id}
                        projectName={assetManagerProject.name}
                    />
                )
            }
        </div >
    );
};
