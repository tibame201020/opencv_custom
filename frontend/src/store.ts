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

export interface LogMessage {
    type: 'stdout' | 'stderr' | 'status' | 'error' | 'result';
    message?: string;
    data?: any;
    timestamp: string;
}

interface AppState {
    // Settings
    theme: string;
    language: string;
    setTheme: (theme: string) => void;
    setLanguage: (lang: string) => void;

    // Navigation
    activeMainTab: 'execution' | 'management' | 'setting' | 'editor' | 'debug';
    isSidebarCollapsed: boolean;
    setActiveMainTab: (tab: 'execution' | 'management' | 'setting' | 'editor' | 'debug') => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Editor State (Persisted)
    editorSelectedScriptId: string | null;
    editorCode: string;
    editorOriginalCode: string;
    editorIsDirty: boolean;
    assetExplorerCollapsed: boolean;
    scriptExplorerCollapsed: boolean;

    setEditorSelectedScriptId: (id: string | null) => void;
    setEditorCode: (code: string) => void;
    setEditorOriginalCode: (code: string) => void;
    setEditorIsDirty: (dirty: boolean) => void;
    setAssetExplorerCollapsed: (collapsed: boolean) => void;
    setScriptExplorerCollapsed: (collapsed: boolean) => void;

    // Global Data
    devices: string[];
    setDevices: (devices: string[]) => void;

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
            activeMainTab: 'execution',
            isSidebarCollapsed: true,
            scriptTabs: [],
            activeTabId: null,

            // State
            devices: [],
            setDevices: (devices) => set({ devices }),

            // Actions
            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setActiveMainTab: (tab) => set({ activeMainTab: tab }),
            setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

            // Editor State Defaults
            editorSelectedScriptId: null,
            editorCode: '',
            editorOriginalCode: '',
            editorIsDirty: false,
            assetExplorerCollapsed: true, // Default to collapsed as requested
            scriptExplorerCollapsed: false,

            setEditorSelectedScriptId: (id) => set({ editorSelectedScriptId: id }),
            setEditorCode: (code) => set({ editorCode: code }),
            setEditorOriginalCode: (code) => set({ editorOriginalCode: code }),
            setEditorIsDirty: (dirty) => set({ editorIsDirty: dirty }),
            setAssetExplorerCollapsed: (collapsed) => set({ assetExplorerCollapsed: collapsed }),
            setScriptExplorerCollapsed: (collapsed) => set({ scriptExplorerCollapsed: collapsed }),

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
                editorCode: state.editorCode,
                editorOriginalCode: state.editorOriginalCode,
                editorIsDirty: state.editorIsDirty,
                assetExplorerCollapsed: state.assetExplorerCollapsed,
                scriptExplorerCollapsed: state.scriptExplorerCollapsed
            }),
        }
    )
);
