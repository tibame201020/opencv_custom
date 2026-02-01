import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Script {
    id: string;
    name: string;
    platform: 'desktop' | 'android';
    description?: string;
}

export interface ScriptTabState {
    id: string; // The script ID
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
    activeMainTab: 'execution' | 'management' | 'setting';
    setActiveMainTab: (tab: 'execution' | 'management' | 'setting') => void;

    // Execution Module State
    scriptTabs: ScriptTabState[];
    activeScriptTabId: string | null;

    openScriptTab: (scriptId: string) => void;
    closeScriptTab: (scriptId: string) => void;
    setActiveScriptTab: (scriptId: string) => void;
    setSubTab: (scriptId: string, subTab: 'control' | 'logs') => void;

    // Execution Updates
    updateScriptStatus: (scriptId: string, status: ScriptTabState['status'], runId?: string) => void;
    appendLog: (scriptId: string, log: Omit<LogMessage, 'timestamp'>) => void;
    clearLogs: (scriptId: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Defaults
            theme: 'dark',
            language: 'zh',
            activeMainTab: 'execution',
            scriptTabs: [],
            activeScriptTabId: null,

            // Actions
            setTheme: (theme) => set({ theme }),
            setLanguage: (language) => set({ language }),
            setActiveMainTab: (tab) => set({ activeMainTab: tab }),

            openScriptTab: (scriptId) => {
                const { scriptTabs } = get();
                const existing = scriptTabs.find(t => t.id === scriptId);

                if (existing) {
                    set({ activeScriptTabId: scriptId });
                    return;
                }

                const newTab: ScriptTabState = {
                    id: scriptId,
                    activeSubTab: 'control',
                    status: 'idle',
                    logs: [],
                    params: {}
                };

                set({
                    scriptTabs: [...scriptTabs, newTab],
                    activeScriptTabId: scriptId
                });
            },

            closeScriptTab: (scriptId) => {
                const { scriptTabs, activeScriptTabId } = get();
                const newTabs = scriptTabs.filter(t => t.id !== scriptId);

                let newActiveId = activeScriptTabId;
                if (activeScriptTabId === scriptId) {
                    newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
                }

                set({ scriptTabs: newTabs, activeScriptTabId: newActiveId });
            },

            setActiveScriptTab: (id) => set({ activeScriptTabId: id }),

            setSubTab: (scriptId, subTab) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.id === scriptId ? { ...t, activeSubTab: subTab } : t)
            })),

            updateScriptStatus: (scriptId, status, runId) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.id === scriptId ? { ...t, status, runId: runId || t.runId } : t)
            })),

            appendLog: (scriptId, log) => set(state => ({
                scriptTabs: state.scriptTabs.map(t =>
                    t.id === scriptId
                        ? { ...t, logs: [...t.logs, { ...log, timestamp: new Date().toISOString() }] }
                        : t
                )
            })),

            clearLogs: (scriptId) => set(state => ({
                scriptTabs: state.scriptTabs.map(t => t.id === scriptId ? { ...t, logs: [] } : t)
            })),

        }),
        {
            name: 'app-storage-v2',
            partialize: (state) => ({
                theme: state.theme,
                language: state.language
            }),
        }
    )
);
