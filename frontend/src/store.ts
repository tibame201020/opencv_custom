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

export interface EditorTab {
    id: string; // unique id (path or composite)
    scriptId: string; // project root
    name: string;
    path: string | null; // relative path
    type: 'code' | 'image';
    content: string; // For images, this will be the URL or base64
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
    activeMainTab: 'execution' | 'management' | 'setting' | 'editor' | 'debug';
    isSidebarCollapsed: boolean;
    setActiveMainTab: (tab: 'execution' | 'management' | 'setting' | 'editor' | 'debug') => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Editor State (Persisted)
    editorSelectedScriptId: string | null;
    editorTabs: EditorTab[];
    activeEditorTabId: string | null;
    activeEditorTabIdPerProject: Record<string, string | null>; // Remember active tab per project
    assetExplorerCollapsed: boolean;
    scriptExplorerCollapsed: boolean;

    setEditorSelectedScriptId: (id: string | null) => void;
    setAssetExplorerCollapsed: (collapsed: boolean) => void;
    setScriptExplorerCollapsed: (collapsed: boolean) => void;

    openEditorTab: (scriptId: string, path: string | null, name: string, content: string, type: 'code' | 'image') => void;
    closeEditorTab: (tabId: string) => void;
    setActiveEditorTab: (tabId: string) => void;
    updateEditorTabContent: (tabId: string, content: string) => void;
    saveEditorTab: (tabId: string) => void;

    // Global Data
    scripts: Script[];
    devices: string[];
    setScripts: (scripts: Script[]) => void;
    setDevices: (devices: string[]) => void;
    fetchScripts: () => Promise<void>;
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
            apiBaseUrl: '/api', // Default to relative path for standard Wails/Vite proxy
            activeMainTab: 'execution',
            isSidebarCollapsed: false,
            scriptTabs: [],
            activeTabId: null,

            // Global Data
            scripts: [],
            devices: [],
            setScripts: (scripts) => set({ scripts }),
            setDevices: (devices) => set({ devices }),

            fetchScripts: async () => {
                const { apiBaseUrl } = get();
                try {
                    const res = await fetch(`${apiBaseUrl}/scripts`);
                    if (res.ok) {
                        const data = await res.json();
                        set({ scripts: data || [] });
                    }
                } catch (err) {
                    console.error("Failed to fetch scripts", err);
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

            // Actions
            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
            setActiveMainTab: (tab) => set({ activeMainTab: tab }),
            setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

            // Editor State Defaults
            editorSelectedScriptId: null,
            editorTabs: [],
            activeEditorTabId: null,
            activeEditorTabIdPerProject: {},
            assetExplorerCollapsed: true, // Default to collapsed as requested
            scriptExplorerCollapsed: false,

            setAssetExplorerCollapsed: (collapsed) => set({ assetExplorerCollapsed: collapsed }),
            setScriptExplorerCollapsed: (collapsed) => set({ scriptExplorerCollapsed: collapsed }),

            setEditorSelectedScriptId: (id) => set(state => {
                // When project changes, switch the active global tab to the one remembered for this project
                const nextActiveTabId = id ? state.activeEditorTabIdPerProject[id] || null : null;
                return {
                    editorSelectedScriptId: id,
                    activeEditorTabId: nextActiveTabId
                };
            }),

            openEditorTab: (scriptId, path, name, content, type) => {
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

            closeEditorTab: (tabId) => {
                const { editorTabs, activeEditorTabId, activeEditorTabIdPerProject } = get();
                const closedTab = editorTabs.find(t => t.id === tabId);
                if (!closedTab) return;

                const newTabs = editorTabs.filter(t => t.id !== tabId);
                const scriptId = closedTab.scriptId;

                // Update global active tab if needed
                let nextActiveId = activeEditorTabId;
                if (activeEditorTabId === tabId) {
                    const projectTabs = newTabs.filter(t => t.scriptId === scriptId);
                    if (projectTabs.length > 0) {
                        nextActiveId = projectTabs[0].id;
                    } else {
                        nextActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
                    }
                }

                // Update project-specific active tab map
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

            setActiveEditorTab: (id) => set(state => {
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

            updateEditorTabContent: (tabId, content) => set(state => ({
                editorTabs: state.editorTabs.map(t =>
                    t.id === tabId ? { ...t, content, isDirty: content !== t.originalContent } : t
                )
            })),

            saveEditorTab: (tabId) => set(state => ({
                editorTabs: state.editorTabs.map(t =>
                    t.id === tabId ? { ...t, originalContent: t.content, isDirty: false } : t
                )
            })),

            openScriptTab: (scriptId, defaultName) => {
                const { scriptTabs } = get();
                const tabId = uuidv4();

                const newTab: ScriptTabState = {
                    tabId,
                    scriptId,
                    label: defaultName || scriptId, // Default label will be updated by view if needed
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

            closeScriptTab: (tabId) => {
                const { scriptTabs, activeTabId } = get();
                const newTabs = scriptTabs.filter(t => t.tabId !== tabId);

                let newActiveId = activeTabId;
                if (activeTabId === tabId) {
                    newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].tabId : null;
                }

                set({ scriptTabs: newTabs, activeTabId: newActiveId });
            },

            setActiveScriptTab: (id) => set({ activeTabId: id }),

            renameScriptTab: (tabId, newLabel) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, label: newLabel } : t)
            })),

            setSubTab: (tabId, subTab) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, activeSubTab: subTab } : t)
            })),

            updateScriptStatus: (tabId, status, runId) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, status, runId: runId || t.runId } : t)
            })),

            updateScriptParams: (tabId, params) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, params: { ...t.params, ...params } } : t)
            })),

            appendLog: (tabId, log) => set(state => ({
                scriptTabs: state.scriptTabs.map(t =>
                    t.tabId === tabId
                        ? { ...t, logs: [...t.logs, { ...log, timestamp: new Date().toISOString() }] }
                        : t
                )
            })),

            clearLogs: (tabId) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.tabId === tabId ? { ...t, logs: [] } : t)
            })),

        }),
        {
            name: 'app-storage-v2',
            partialize: (state) => ({
                theme: state.theme,
                language: state.language,
                isSidebarCollapsed: state.isSidebarCollapsed,
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
