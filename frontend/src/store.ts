import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Script {
    id: string;
    name: string;
    platform: 'desktop' | 'android';
    description?: string;
    path?: string;
}

export interface ScriptTabState {
    tabId: string;   // Unique instance ID
    scriptId: string; // The source script ID
    label: string; // Editable tab name
    activeSubTab: 'control' | 'logs';
    status: 'idle' | 'running' | 'stopped' | 'error';
    logs: LogMessage[];
    params: Record<string, any>;
    runId?: string; // Active backend run ID
}

export interface WorkflowNodeData {
    id: string;
    type: string;
    label: string;
    config: Record<string, any>;
    position: { x: number; y: number };
}

export interface WorkflowEdgeData {
    id: string;
    source: string;
    target: string;
    signal: string;
}

export interface EditorTab {
    id: string; // unique id (path or composite)
    scriptId: string; // project root
    name: string;
    path: string | null; // relative path
    type: 'code' | 'image' | 'workflow';
    content: string; // For images, this will be the URL or base64. For workflow, this will be the YAML string.
    originalContent: string;
    isDirty: boolean;
    workflowData?: {
        nodes: WorkflowNodeData[];
        edges: WorkflowEdgeData[];
    };
}

export interface WorkflowTab {
    id: string; // workflow ID
    workflowId: string;
    projectId: string;
    name: string;
    content: string; // JSON string of the workflow data
    originalContent: string;
    isDirty: boolean;
}

export interface LogMessage {
    type: 'stdout' | 'stderr' | 'status' | 'error' | 'result';
    message?: string;
    data?: any;
    timestamp: string;
}

interface AppState {
    theme: string;
    language: string;
    apiBaseUrl: string;
    setTheme: (theme: string) => void;
    setLanguage: (lang: string) => void;
    setApiBaseUrl: (url: string) => void;

    // Navigation
    activeMainTab: 'execution' | 'editor' | 'workflow' | 'management' | 'setting' | 'debug';
    isSidebarCollapsed: boolean;
    setActiveMainTab: (tab: 'execution' | 'editor' | 'workflow' | 'management' | 'setting' | 'debug') => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Workflow State
    projectSelectedId: string | null;
    workflowSelectedId: string | null;
    workflowAssetExplorerCollapsed: boolean;
    workflowSidebarCollapsed: boolean;

    setProjectSelectedId: (id: string | null) => void;
    setWorkflowSelectedId: (id: string | null) => void;
    setWorkflowAssetExplorerCollapsed: (collapsed: boolean) => void;
    setWorkflowSidebarCollapsed: (collapsed: boolean) => void;

    // Workflow Editor Tabs (Independent from Script Editor)
    workflowTabs: WorkflowTab[];
    activeWorkflowTabId: string | null;

    openWorkflowTab: (workflowId: string, projectId: string, name: string, content: string) => void;
    closeWorkflowTab: (tabId: string) => void;
    setActiveWorkflowTab: (tabId: string) => void;
    updateWorkflowTabContent: (tabId: string, content: string) => void;
    saveWorkflowTab: (tabId: string) => void;

    // Editor State (Persisted) — Script Editor only
    editorSelectedScriptId: string | null;
    editorTabs: EditorTab[];
    activeEditorTabId: string | null;
    activeEditorTabIdPerProject: Record<string, string | null>; // Remember active tab per project
    assetExplorerCollapsed: boolean;
    scriptExplorerCollapsed: boolean;

    setEditorSelectedScriptId: (id: string | null) => void;
    setAssetExplorerCollapsed: (collapsed: boolean) => void;
    setScriptExplorerCollapsed: (collapsed: boolean) => void;

    openEditorTab: (scriptId: string, path: string | null, name: string, content: string, type: 'code' | 'image' | 'workflow') => void;
    closeEditorTab: (tabId: string) => void;
    setActiveEditorTab: (tabId: string) => void;
    updateEditorTabContent: (tabId: string, content: string) => void;
    saveEditorTab: (tabId: string) => void;

    // Global Data
    scripts: Script[];
    projects: any[];
    devices: string[];
    setScripts: (scripts: Script[]) => void;
    setProjects: (projects: any[]) => void;
    setDevices: (devices: string[]) => void;
    fetchScripts: () => Promise<void>;
    fetchProjects: () => Promise<void>;
    fetchDevices: () => Promise<void>;

    // Execution Module State
    scriptTabs: ScriptTabState[];
    activeTabId: string | null;

    openScriptTab: (scriptId: string, defaultName?: string) => void;
    closeScriptTab: (tabId: string) => void;
    setActiveScriptTab: (tabId: string) => void;
    renameScriptTab: (tabId: string, newLabel: string) => void;
    setSubTab: (tabId: string, subTab: 'control' | 'logs') => void;

    // Execution Updates
    updateScriptStatus: (tabId: string, status: ScriptTabState['status'], runId?: string) => void;
    updateScriptParams: (tabId: string, params: Partial<ScriptTabState['params']>) => void;
    appendLog: (tabId: string, log: Omit<LogMessage, 'timestamp'>) => void;
    clearLogs: (tabId: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Defaults
            theme: 'dark',
            language: 'zh',
            apiBaseUrl: '/api',
            activeMainTab: 'execution',
            isSidebarCollapsed: false,
            scriptTabs: [],
            activeTabId: null,

            // Workflow State Defaults
            projectSelectedId: null,
            workflowSelectedId: null,
            workflowAssetExplorerCollapsed: true,
            workflowSidebarCollapsed: false,
            workflowTabs: [],
            activeWorkflowTabId: null,

            setProjectSelectedId: (id: string | null) => set({ projectSelectedId: id }),
            setWorkflowSelectedId: (id: string | null) => set({ workflowSelectedId: id }),
            setWorkflowAssetExplorerCollapsed: (collapsed: boolean) => set({ workflowAssetExplorerCollapsed: collapsed }),
            setWorkflowSidebarCollapsed: (collapsed: boolean) => set({ workflowSidebarCollapsed: collapsed }),

            // Workflow Tab Actions
            openWorkflowTab: (workflowId: string, projectId: string, name: string, content: string) => {
                const { workflowTabs } = get();
                const tabId = `wf:${workflowId}`;
                const existing = workflowTabs.find(t => t.id === tabId);
                if (existing) {
                    set({
                        workflowTabs: workflowTabs.map(t =>
                            t.id === tabId ? { ...t, content, originalContent: content, isDirty: false } : t
                        ),
                        activeWorkflowTabId: tabId,
                    });
                    return;
                }
                const newTab: WorkflowTab = {
                    id: tabId,
                    workflowId,
                    projectId,
                    name,
                    content,
                    originalContent: content,
                    isDirty: false,
                };
                set({
                    workflowTabs: [...workflowTabs, newTab],
                    activeWorkflowTabId: tabId,
                });
            },

            closeWorkflowTab: (tabId: string) => {
                const { workflowTabs, activeWorkflowTabId } = get();
                const newTabs = workflowTabs.filter(t => t.id !== tabId);
                let nextId = activeWorkflowTabId;
                if (activeWorkflowTabId === tabId) {
                    nextId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
                }
                set({ workflowTabs: newTabs, activeWorkflowTabId: nextId });
            },

            setActiveWorkflowTab: (tabId: string) => set({ activeWorkflowTabId: tabId }),

            updateWorkflowTabContent: (tabId: string, content: string) => set(state => ({
                workflowTabs: state.workflowTabs.map(t =>
                    t.id === tabId ? { ...t, content, isDirty: content !== t.originalContent } : t
                )
            })),



            saveWorkflowTab: (tabId: string) => set(state => ({
                workflowTabs: state.workflowTabs.map(t =>
                    t.id === tabId ? { ...t, originalContent: t.content, isDirty: false } : t
                )
            })),

            // Actions
            setTheme: (theme: string) => set({ theme }),
            setLanguage: (language: string) => set({ language }),
            setApiBaseUrl: (apiBaseUrl: string) => set({ apiBaseUrl }),
            setActiveMainTab: (tab: 'execution' | 'editor' | 'workflow' | 'management' | 'setting' | 'debug') => set({ activeMainTab: tab }),
            setSidebarCollapsed: (isSidebarCollapsed: boolean) => set({ isSidebarCollapsed }),

            // Global Data
            scripts: [],
            projects: [],
            devices: [],
            setScripts: (scripts: Script[]) => set({ scripts }),
            setProjects: (projects: any[]) => set({ projects: Array.isArray(projects) ? projects : [] }),
            setDevices: (devices: string[]) => set({ devices }),

            fetchScripts: async () => {
                const { apiBaseUrl } = get();
                try {
                    const res = await fetch(`${apiBaseUrl}/scripts`);
                    if (res.ok) {
                        const data = await res.json();
                        set({ scripts: Array.isArray(data) ? data : [] });
                    }
                } catch (err) {
                    console.error("Failed to fetch scripts", err);
                }
            },

            fetchProjects: async () => {
                const { apiBaseUrl } = get();
                try {
                    const res = await fetch(`${apiBaseUrl}/projects`);
                    if (res.ok) {
                        const data = await res.json();
                        set({ projects: Array.isArray(data) ? data : [] });
                    }
                } catch (err) {
                    console.error("Failed to fetch projects", err);
                }
            },

            fetchDevices: async () => {
                const { apiBaseUrl } = get();
                try {
                    const res = await fetch(`${apiBaseUrl}/devices`);
                    if (res.ok) {
                        const data = await res.json();
                        set({ devices: data || [] });
                    }
                } catch (err) {
                    console.error("Failed to fetch devices", err);
                }
            },

            // Editor State Defaults
            editorSelectedScriptId: null,
            editorTabs: [],
            activeEditorTabId: null,
            activeEditorTabIdPerProject: {},
            assetExplorerCollapsed: true,
            scriptExplorerCollapsed: false,

            setAssetExplorerCollapsed: (collapsed: boolean) => set({ assetExplorerCollapsed: collapsed }),
            setScriptExplorerCollapsed: (collapsed: boolean) => set({ scriptExplorerCollapsed: collapsed }),

            setEditorSelectedScriptId: (id: string | null) => set(state => {
                const nextActiveTabId = id ? state.activeEditorTabIdPerProject[id] || null : null;
                return {
                    editorSelectedScriptId: id,
                    activeEditorTabId: nextActiveTabId
                };
            }),

            openEditorTab: (scriptId: string, path: string | null, name: string, content: string, type: 'code' | 'image' | 'workflow') => {
                const { editorTabs, activeEditorTabIdPerProject } = get();
                const tabId = path ? `${scriptId}/${path}` : `${scriptId}/__main__`;

                const existingTab = editorTabs.find(t => t.id === tabId);
                if (existingTab) {
                    set({
                        editorTabs: editorTabs.map(t =>
                            t.id === tabId ? { ...t, content, originalContent: content, isDirty: false } : t
                        ),
                        activeEditorTabId: tabId,
                        activeEditorTabIdPerProject: {
                            ...activeEditorTabIdPerProject,
                            [scriptId]: tabId
                        }
                    });
                    return;
                }

                const newTab: EditorTab = {
                    id: tabId,
                    scriptId,
                    name,
                    path,
                    type,
                    content,
                    originalContent: content,
                    isDirty: false
                };

                set({
                    editorTabs: [...editorTabs, newTab],
                    activeEditorTabId: tabId,
                    activeEditorTabIdPerProject: {
                        ...activeEditorTabIdPerProject,
                        [scriptId]: tabId
                    }
                });
            },

            closeEditorTab: (tabId: string) => {
                const { editorTabs, activeEditorTabId, activeEditorTabIdPerProject } = get();
                const closedTab = editorTabs.find(t => t.id === tabId);
                if (!closedTab) return;

                const newTabs = editorTabs.filter(t => t.id !== tabId);
                const scriptId = closedTab.scriptId;

                let nextActiveId = activeEditorTabId;
                if (activeEditorTabId === tabId) {
                    const projectTabs = newTabs.filter(t => t.scriptId === scriptId);
                    if (projectTabs.length > 0) {
                        nextActiveId = projectTabs[0].id;
                    } else {
                        nextActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
                    }
                }

                let nextProjectActiveId = activeEditorTabIdPerProject[scriptId];
                if (nextProjectActiveId === tabId) {
                    const projectTabs = newTabs.filter(t => t.scriptId === scriptId);
                    nextProjectActiveId = projectTabs.length > 0 ? projectTabs[0].id : null;
                }

                set({
                    editorTabs: newTabs,
                    activeEditorTabId: nextActiveId,
                    activeEditorTabIdPerProject: {
                        ...activeEditorTabIdPerProject,
                        [scriptId]: nextProjectActiveId
                    }
                });
            },

            setActiveEditorTab: (id: string) => set(state => {
                const tab = state.editorTabs.find(t => t.id === id);
                if (!tab) return { activeEditorTabId: id };
                return {
                    activeEditorTabId: id,
                    activeEditorTabIdPerProject: {
                        ...state.activeEditorTabIdPerProject,
                        [tab.scriptId]: id
                    }
                };
            }),

            updateEditorTabContent: (tabId: string, content: string) => set(state => ({
                editorTabs: state.editorTabs.map(t =>
                    t.id === tabId ? { ...t, content, isDirty: content !== t.originalContent } : t
                )
            })),

            saveEditorTab: (tabId: string) => set(state => ({
                editorTabs: state.editorTabs.map(t =>
                    t.id === tabId ? { ...t, originalContent: t.content, isDirty: false } : t
                )
            })),

            openScriptTab: (scriptId: string, defaultName?: string) => {
                const { scriptTabs } = get();
                const tabId = uuidv4();

                const newTab: ScriptTabState = {
                    tabId,
                    scriptId,
                    label: defaultName || scriptId,
                    activeSubTab: 'control',
                    status: 'idle',
                    logs: [],
                    params: {}
                };

                set({
                    scriptTabs: [...scriptTabs, newTab],
                    activeTabId: tabId
                });
            },

            closeScriptTab: (tabId: string) => {
                const { scriptTabs, activeTabId } = get();
                const newTabs = scriptTabs.filter(t => t.tabId !== tabId);

                let newActiveId = activeTabId;
                if (activeTabId === tabId) {
                    newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].tabId : null;
                }

                set({ scriptTabs: newTabs, activeTabId: newActiveId });
            },

            setActiveScriptTab: (id: string) => set({ activeTabId: id }),

            renameScriptTab: (tabId: string, newLabel: string) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, label: newLabel } : t)
            })),

            setSubTab: (tabId: string, subTab: 'control' | 'logs') => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, activeSubTab: subTab } : t)
            })),

            updateScriptStatus: (tabId: string, status: ScriptTabState['status'], runId?: string) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, status, runId: runId || t.runId } : t)
            })),

            updateScriptParams: (tabId: string, params: Partial<ScriptTabState['params']>) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, params: { ...t.params, ...params } } : t)
            })),

            appendLog: (tabId: string, log: Omit<LogMessage, 'timestamp'>) => set(state => ({
                scriptTabs: state.scriptTabs.map(t =>
                    t.tabId === tabId
                        ? { ...t, logs: [...t.logs, { ...log, timestamp: new Date().toISOString() }] }
                        : t
                )
            })),

            clearLogs: (tabId: string) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, logs: [] } : t)
            })),
        }),
        {
            name: 'app-storage-v2',
            partialize: (state: AppState) => ({
                theme: state.theme,
                language: state.language,
                isSidebarCollapsed: state.isSidebarCollapsed,
                projectSelectedId: state.projectSelectedId,
                workflowSelectedId: state.workflowSelectedId,
                workflowAssetExplorerCollapsed: state.workflowAssetExplorerCollapsed,
                workflowSidebarCollapsed: state.workflowSidebarCollapsed,
                workflowTabs: state.workflowTabs,
                activeWorkflowTabId: state.activeWorkflowTabId,
                editorSelectedScriptId: state.editorSelectedScriptId,
                editorTabs: state.editorTabs,
                activeEditorTabId: state.activeEditorTabId,
                activeEditorTabIdPerProject: state.activeEditorTabIdPerProject,
                assetExplorerCollapsed: state.assetExplorerCollapsed,
                scriptExplorerCollapsed: state.scriptExplorerCollapsed
            }),
        }
    )
);
