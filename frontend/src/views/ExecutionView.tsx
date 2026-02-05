import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Script } from '../store';
import {
    Play, Square, Search, X, Monitor, Smartphone,
    Terminal, Sliders, ChevronRight, ChevronLeft,
    Trash2, ArrowDown, ArrowUp, WrapText, Filter, XCircle, Download
} from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import clsx from 'clsx';



export const ExecutionView: React.FC = () => {
    const { t } = useTranslation();
    const {
        scriptTabs, activeTabId,
        openScriptTab, closeScriptTab, setActiveScriptTab, setSubTab,
        updateScriptStatus, appendLog, renameScriptTab, updateScriptParams,
        apiBaseUrl
    } = useAppStore();

    const API_Base = apiBaseUrl;

    // Improved WS URL construction to handle relative/absolute paths correctly
    const getWSBase = () => {
        if (apiBaseUrl.startsWith('http')) {
            return apiBaseUrl.replace('http://', 'ws://').replace('/api', '/ws/logs');
        }
        // Relative path case (e.g. Wails AssetServer or Vite proxy)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/logs`;
    };
    const WS_Base = getWSBase();

    // UI State
    const [scripts, setScripts] = useState<Script[]>([]);
    const [devices, setDevices] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    // Renaming State
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Close Confirmation State
    const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);

    // Backend Connection Refs
    const wsMap = useRef<Map<string, WebSocket>>(new Map()); // Key is tabId now
    const logEndRef = useRef<HTMLDivElement>(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'info' | 'error'>('info');

    const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Fetch scripts
    useEffect(() => {
        const fetchScripts = async () => {
            try {
                const res = await fetch(`${API_Base}/scripts`);
                if (!res.ok) throw new Error("Failed to fetch scripts");
                const data = await res.json();
                setScripts(data || []);
            } catch (err) {
                console.error("Failed to fetch scripts", err);
                setScripts([]);
            }
        };

        const fetchDevices = async () => {
            try {
                const res = await fetch(`${API_Base}/devices`);
                if (!res.ok) throw new Error("Failed to fetch devices");
                const data = await res.json();
                setDevices(data || []);
            } catch (err) {
                console.error("Failed to fetch devices", err);
                setDevices([]);
            }
        };

        fetchDevices();
        fetchScripts();
    }, []);

    // Helper: Find Script Definition
    const getScriptDef = (scriptId: string) => scripts.find(s => s.id === scriptId);

    // Open Tab Wrapper
    const handleOpenTab = (scriptId: string) => {
        const script = getScriptDef(scriptId);
        openScriptTab(scriptId, script?.name || scriptId);
    };

    // Derived Data
    const filteredScripts = scripts.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const activeTab = scriptTabs.find(t => t.tabId === activeTabId);

    // Auto-scroll Logs
    useEffect(() => {
        if (activeTab && activeTab.activeSubTab === 'logs' && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeTab?.logs.length, activeTab?.activeSubTab]);

    // Handle Tab Renaming
    const startEditing = (tabId: string, currentLabel: string) => {
        setEditingTabId(tabId);
        setEditName(currentLabel);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const saveEditing = () => {
        if (editingTabId && editName.trim()) {
            renameScriptTab(editingTabId, editName.trim());
        }
        setEditingTabId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveEditing();
        if (e.key === 'Escape') setEditingTabId(null);
    };

    // Run Script Logic
    const handleRun = async (tabId: string, scriptId: string) => {
        const activeTab = scriptTabs.find(t => t.tabId === tabId);
        const scriptDef = getScriptDef(scriptId);

        if (!activeTab || !scriptDef) return;

        // Validation: Android requires Device ID
        if (scriptDef.platform === 'android' && !activeTab.params?.deviceId) {
            showToast("Please select a target device before running!", "error");
            // Highlight the select box if possible, or just return
            return;
        }

        updateScriptStatus(tabId, 'running');
        setSubTab(tabId, 'logs'); // Switch to console view automatically
        try {
            const params = activeTab.params ? JSON.stringify(activeTab.params) : "{}";

            const res = await fetch(`${API_Base}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId, params })
            });

            if (!res.ok) throw new Error("Failed to start script");
            const data = await res.json();
            const runId = data.runId;
            updateScriptStatus(tabId, 'running', runId);

            // Close existing WS for this TAB instance if any
            if (wsMap.current.has(tabId)) {
                wsMap.current.get(tabId)?.close();
            }

            console.log(`Connecting to WebSocket: ${WS_Base}/${runId}`);
            const ws = new WebSocket(`${WS_Base}/${runId}`);
            wsMap.current.set(tabId, ws);

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
                    const { timestamp, ...logData } = parsed;
                    appendLog(tabId, logData);

                    if (parsed.type === 'status' && parsed.message === 'Process exited') {
                        updateScriptStatus(tabId, 'stopped');
                    }
                } catch (e) {
                    appendLog(tabId, { type: 'stdout', message: event.data });
                }
            };
        } catch (err: any) {
            updateScriptStatus(tabId, 'error');
            const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
            appendLog(tabId, { type: 'error', message: 'Failed to start: ' + errorMsg });
            showToast('Failed to start script: ' + errorMsg, 'error');
        }
    };

    const handleStop = async (tabId: string) => {
        // Optimistic update
        updateScriptStatus(tabId, 'stopped');

        // Find runId from store if available
        const tab = scriptTabs.find(t => t.tabId === tabId);
        if (tab?.runId) {
            try {
                await axios.post(`${API_Base}/stop`, { runId: tab.runId });
            } catch (err) {
                console.error("Failed to stop script", err);
            }
        }
    };

    // Handle Tab Close Request
    const handleCloseTabRequest = (tabId: string) => {
        const tab = scriptTabs.find(t => t.tabId === tabId);
        if (tab?.status === 'running') {
            setConfirmCloseTabId(tabId);
        } else {
            closeScriptTab(tabId);
        }
    };

    const confirmCloseRunningTab = async () => {
        if (confirmCloseTabId) {
            await handleStop(confirmCloseTabId);
            closeScriptTab(confirmCloseTabId);
            setConfirmCloseTabId(null);
        }
    };

    return (
        <div className="flex h-full bg-base-100 overflow-hidden relative">

            {/* Script List Drawer */}
            <div
                className={clsx(
                    "bg-base-100 border-r border-base-200 flex flex-col shrink-0 transition-all duration-300 relative",
                    isDrawerOpen ? "w-64" : "w-16"
                )}
            >
                {/* Drawer Header & Toggle (Clickable Row) */}
                <div
                    className={clsx(
                        "h-14 flex items-center border-b border-base-200 shrink-0 cursor-pointer hover:bg-base-200/50 transition-colors select-none",
                        isDrawerOpen ? "px-4 justify-between" : "justify-center px-0"
                    )}
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    title={isDrawerOpen ? "Collapse List" : "Expand List"}
                >
                    {isDrawerOpen && (
                        <div className="font-bold text-xs uppercase opacity-50 tracking-wider">Script List</div>
                    )}
                    <button
                        className="btn btn-ghost btn-xs btn-square opacity-50 pointer-events-none"
                    >
                        {isDrawerOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>

                {/* Search */}
                {isDrawerOpen && (
                    <div className="p-3 border-b border-base-200/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                            <input
                                type="text"
                                placeholder={t('ui.execution.searchData')}
                                className="input input-sm input-bordered w-full pl-9 bg-base-200/50 focus:bg-base-100 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* List Items (Templates) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    {filteredScripts.map(script => (
                        <div
                            key={script.id}
                            className={clsx(
                                "group flex items-center gap-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent select-none",
                                isDrawerOpen ? "p-3 hover:bg-base-200" : "p-2 justify-center hover:bg-base-200 aspect-square"
                            )}
                            onDoubleClick={() => handleOpenTab(script.id)}
                            title={!isDrawerOpen ? script.name : "Double-click to create instance"}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                script.platform === 'android' ? "bg-success/10 text-success" : "bg-info/10 text-info"
                            )}>
                                {script.platform === 'android' ? <Smartphone size={18} /> : <Monitor size={18} />}
                            </div>

                            <div className={clsx("flex-1 min-w-0 transition-opacity duration-200", isDrawerOpen ? "opacity-100" : "opacity-0 w-0 hidden")}>
                                <div className="font-medium text-sm truncate leading-tight">{script.name}</div>
                                <div className="text-[10px] opacity-50 uppercase font-bold mt-0.5">{script.platform}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workspace Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-base-100/5">
                {/* Tabs Header (Chrome-like) */}
                <div className="flex items-end gap-1 px-2 pt-2 bg-base-300 border-b border-base-300 overflow-x-auto [&::-webkit-scrollbar]:hidden h-11 shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {scriptTabs.map(tab => {
                        const isActive = activeTabId === tab.tabId;
                        const isEditing = editingTabId === tab.tabId;

                        return (
                            <div
                                key={tab.tabId}
                                className={clsx(
                                    "relative flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium cursor-pointer select-none transition-all min-w-[150px] max-w-[240px] group border-b-0 h-full",
                                    isActive
                                        ? "bg-base-100 text-base-content shadow-[0_-5px_10px_-5px_rgba(0,0,0,0.2)] z-10"
                                        : "bg-transparent text-base-content/50 hover:bg-base-content/10 hover:text-base-content mb-0.5"
                                )}
                                onClick={() => setActiveScriptTab(tab.tabId)}
                                onDoubleClick={(e) => { e.stopPropagation(); startEditing(tab.tabId, tab.label); }}
                            >
                                {/* Separator style for inactive tabs (pseudo-element simulation) */}
                                {!isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-white/10 group-last:hidden group-hover:hidden" />}

                                <span className={clsx("w-2 h-2 rounded-full shrink-0",
                                    tab.status === 'running' ? "bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                        tab.status === 'error' ? "bg-error" : "bg-base-content/20"
                                )} />

                                {isEditing ? (
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        className="input input-xs input-ghost h-auto p-0 flex-1 min-w-0 bg-transparent focus:outline-none font-medium text-inherit"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveEditing}
                                        onKeyDown={handleKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate flex-1" title={tab.label}>{tab.label}</span>
                                )}

                                <button
                                    className="opacity-0 group-hover:opacity-100 hover:bg-base-content/10 rounded-full p-0.5 transition-all text-inherit"
                                    onClick={(e) => { e.stopPropagation(); handleCloseTabRequest(tab.tabId); }}
                                >
                                    <X size={12} />
                                </button>

                                {/* Bottom masking to blend with content when active */}
                                {isActive && <div className="absolute -bottom-1 left-0 right-0 h-2 bg-base-100 z-20" />}
                            </div>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-4 overflow-hidden relative">
                    {activeTab ? (
                        <div className="h-full flex flex-col bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Toolbar */}
                            <div className="h-14 border-b border-base-200 flex items-center justify-between px-4 bg-base-100/50">
                                <div className="flex items-center gap-4">
                                    <div className="join bg-base-200/50 p-1 rounded-lg">
                                        <button
                                            className={clsx("btn btn-sm join-item border-none shadow-none", activeTab.activeSubTab === 'control' ? "btn-primary" : "btn-ghost")}
                                            onClick={() => setSubTab(activeTab.tabId, 'control')}
                                        >
                                            <Sliders size={14} /> <span className="hidden sm:inline">{t('ui.execution.params')}</span>
                                        </button>
                                        <button
                                            className={clsx("btn btn-sm join-item border-none shadow-none", activeTab.activeSubTab === 'logs' ? "btn-primary" : "btn-ghost")}
                                            onClick={() => setSubTab(activeTab.tabId, 'logs')}
                                        >
                                            <Terminal size={14} /> <span className="hidden sm:inline">{t('ui.execution.console')}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className={clsx("badge gap-2 font-mono uppercase font-bold",
                                        activeTab.status === 'running' ? "badge-success text-success-content" : "badge-ghost"
                                    )}>
                                        {activeTab.status}
                                    </div>
                                    <div className="h-6 w-px bg-base-300 mx-2"></div>
                                    <button className="btn btn-sm btn-error" disabled={activeTab.status !== 'running'} onClick={() => handleStop(activeTab.tabId)}>
                                        <Square size={14} fill="currentColor" /> {t('ui.execution.stop')}
                                    </button>
                                    <button className="btn btn-sm btn-success" disabled={activeTab.status === 'running'} onClick={() => handleRun(activeTab.tabId, activeTab.scriptId)}>
                                        <Play size={14} fill="currentColor" /> {t('ui.execution.start')}
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-auto bg-base-100 relative">
                                {activeTab.activeSubTab === 'control' ? (
                                    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <h3 className="text-xs font-bold uppercase opacity-50 mb-4 tracking-widest">Configuration</h3>
                                            <div className="card bg-base-200/30 border border-base-200 rounded-xl p-6 space-y-4">
                                                <div className="form-control">
                                                    <label className="label cursor-pointer justify-start gap-4">
                                                        <span className="font-bold">Instance Name (Label)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="input input-bordered w-full font-mono"
                                                        value={activeTab.label}
                                                        onChange={(e) => renameScriptTab(activeTab.tabId, e.target.value)}
                                                    />
                                                </div>
                                                <div className="form-control">
                                                    <label className="label cursor-pointer justify-start gap-4">
                                                        <span className="font-bold">Target Device ID</span>
                                                    </label>
                                                    {getScriptDef(activeTab.scriptId)?.platform === 'android' ? (
                                                        <select
                                                            className="select select-bordered w-full font-mono"
                                                            value={activeTab.params?.deviceId || ''}
                                                            onChange={(e) => updateScriptParams(activeTab.tabId, { deviceId: e.target.value })}
                                                        >
                                                            <option value="" disabled>Select a device</option>
                                                            {devices?.map(d => <option key={d} value={d}>{d}</option>)}
                                                            {devices.length === 0 && <option value="" disabled>No devices found (Is ADB running?)</option>}
                                                        </select>
                                                    ) : (
                                                        <div className="text-sm opacity-50 italic px-1">Not required for Desktop platform</div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <LogConsole
                                        logs={activeTab.logs}
                                        instanceName={activeTab.label}
                                        onClear={() => {
                                            // Call store action
                                            useAppStore.getState().clearLogs(activeTab.tabId);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                            <Monitor size={48} className="mb-4" />
                            <div className="font-bold text-lg">No Script Active</div>
                            <p className="text-sm text-center max-w-xs leading-relaxed">
                                Select a script template from the left to create a new execution instance.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {/* Close Confirmation Modal */}
            {confirmCloseTabId && (
                <div className="modal modal-open bg-black/50 backdrop-blur-sm z-[9999]">
                    <div className="modal-box bg-base-100 border border-base-200 shadow-2xl">
                        <h3 className="font-bold text-lg text-warning flex items-center gap-2">
                            <Square size={20} fill="currentColor" />
                            Stop & Close?
                        </h3>
                        <p className="py-4 text-sm text-base-content/80">
                            The script <span className="font-mono font-bold text-base-content bg-base-200 px-1 rounded">{scriptTabs.find(t => t.tabId === confirmCloseTabId)?.label}</span> is currently running.
                            <br /><br />
                            Closing this tab will <b>terminate the process</b> immediately.
                        </p>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setConfirmCloseTabId(null)}>Cancel</button>
                            <button className="btn btn-error" onClick={confirmCloseRunningTab}>Stop & Close</button>
                        </div>
                    </div>
                    {/* Click outside to cancel */}
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setConfirmCloseTabId(null)}>close</button>
                    </form>
                </div>
            )}

            {/* Toast Notifications */}
            {toastMessage && (
                <div className="toast toast-bottom toast-end z-[9999]">
                    <div className={clsx("active:scale-95 transition-transform alert shadow-lg font-bold border-none",
                        toastType === 'error' ? "alert-error text-error-content" : "alert-info text-info-content"
                    )}>
                        <span>{toastMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for performance and state isolation
const LogConsole: React.FC<{
    logs: any[],
    instanceName: string,
    onClear: () => void
}> = ({ logs, instanceName, onClear }) => {
    // Search & Filter State
    const [searchText, setSearchText] = useState('');
    const [searchMode, setSearchMode] = useState<'filter' | 'find'>('find'); // 'find' = highlight & nav; 'filter' = show matching lines only
    const [matches, setMatches] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1); // Index in the 'matches' array

    // Display State
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [isWrap, setIsWrap] = useState(true);

    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Filter Logic (Derived)
    const displayLogs = React.useMemo(() => {
        if (searchMode === 'filter' && searchText) {
            const lower = searchText.toLowerCase();
            return logs.filter(l =>
                (l.message && l.message.toLowerCase().includes(lower)) ||
                (l.type && l.type.includes(lower))
            );
        }
        return logs;
    }, [logs, searchText, searchMode]);

    // Find Logic (Highlight Matches)
    useEffect(() => {
        if (searchMode === 'find' && searchText) {
            const lower = searchText.toLowerCase();
            const newMatches: number[] = [];
            logs.forEach((l, idx) => {
                if ((l.message && l.message.toLowerCase().includes(lower)) || (l.type && l.type.includes(lower))) {
                    newMatches.push(idx);
                }
            });
            setMatches(newMatches);
            // Reset current index if logs changed significantly or search changed
            // If strictly appending logs, maybe keep index? For simplicity, jump to last match on new search
            if (newMatches.length > 0) {
                setCurrentMatchIndex(newMatches.length - 1); // Jump to latest match by default
            } else {
                setCurrentMatchIndex(-1);
            }
        } else {
            setMatches([]);
            setCurrentMatchIndex(-1);
        }
    }, [logs.length, searchText, searchMode]); // Re-run when logs grow

    // Navigation Handlers
    const scrollToIndex = (index: number) => {
        setIsAutoScroll(false); // Disable auto-scroll when manually navigating
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
    };

    const nextMatch = () => {
        if (matches.length === 0) return;
        const next = (currentMatchIndex + 1) % matches.length;
        setCurrentMatchIndex(next);
        scrollToIndex(matches[next]);
    };

    const prevMatch = () => {
        if (matches.length === 0) return;
        const prev = (currentMatchIndex - 1 + matches.length) % matches.length;
        setCurrentMatchIndex(prev);
        scrollToIndex(matches[prev]);
    };

    const handleDownload = () => {
        if (logs.length === 0) return;
        const content = logs.map(l => {
            const time = l.timestamp ? l.timestamp.replace('T', ' ').split('.')[0] : '';
            return `[${time}] [${l.type || 'INFO'}] ${l.message}`;
        }).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${instanceName || 'console'}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Helper to highlight text
    const renderMessage = (msg: string, type: string) => {
        // Base color class
        const colorClass =
            type === 'error' ? "text-red-400 font-bold" :
                type === 'status' ? "text-blue-400 font-bold" :
                    type === 'success' ? "text-emerald-400 font-bold" :
                        type === 'warning' ? "text-yellow-400" :
                            "text-gray-300";

        if (searchMode === 'find' && searchText && msg.toLowerCase().includes(searchText.toLowerCase())) {
            const parts = msg.split(new RegExp(`(${searchText})`, 'gi'));
            return (
                <span className={colorClass}>
                    {parts.map((part, i) =>
                        part.toLowerCase() === searchText.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-500/50 text-white rounded-[1px] px-0.5">{part}</mark>
                        ) : (
                            part
                        )
                    )}
                </span>
            );
        }
        return <span className={colorClass}>{msg}</span>;
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 font-mono text-sm relative">
            {/* Console Toolbar */}
            <div className="h-10 flex items-center justify-between px-2 border-b border-white/10 bg-[#2d2d2d] shrink-0 select-none z-10">
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                    {/* Mode Toggle */}
                    <div className="join bg-black/20 rounded-md p-0.5">
                        <button
                            className={clsx("join-item btn btn-xs border-none h-6 min-h-0 px-2 hover:bg-white/10 text-gray-400", searchMode === 'find' ? "bg-white/10 text-white" : "")}
                            onClick={() => setSearchMode('find')}
                            title="Find & Highlight"
                        >
                            <Search size={12} />
                        </button>
                        <button
                            className={clsx("join-item btn btn-xs border-none h-6 min-h-0 px-2 hover:bg-white/10 text-gray-400", searchMode === 'filter' ? "bg-white/10 text-white" : "")}
                            onClick={() => setSearchMode('filter')}
                            title="Filter Lines"
                        >
                            <Filter size={12} />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-[300px]">
                        <input
                            type="text"
                            placeholder={searchMode === 'find' ? "Find keyword..." : "Filter logs..."}
                            className={clsx(
                                "input input-xs input-ghost h-7 w-full pl-2 pr-16 bg-black/20 focus:bg-black/40 text-gray-200 placeholder:text-gray-500 focus:text-white focus:outline-none transition-colors rounded-sm",
                                searchText && "bg-black/40 font-bold"
                            )}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchMode === 'find') {
                                    if (e.shiftKey) prevMatch(); else nextMatch();
                                }
                            }}
                        />
                        {/* Match Counter / Clear */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {searchText && (
                                <>
                                    <span className="text-[10px] opacity-50 font-mono text-gray-400">
                                        {searchMode === 'find' ? (
                                            matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0/0'
                                        ) : (
                                            `${displayLogs.length}`
                                        )}
                                    </span>
                                    <button onClick={() => setSearchText('')} className="text-gray-500 hover:text-white p-0.5">
                                        <XCircle size={12} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Navigation Buttons (Only in Find mode) */}
                    {searchMode === 'find' && (
                        <div className="join gap-0.5">
                            <button
                                className="btn btn-xs btn-ghost btn-square h-7 min-h-0 rounded-sm disabled:bg-transparent text-gray-400 hover:text-white hover:bg-white/10"
                                disabled={matches.length === 0}
                                onClick={prevMatch}
                                title="Previous Match (Shift+Enter)"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                className="btn btn-xs btn-ghost btn-square h-7 min-h-0 rounded-sm disabled:bg-transparent text-gray-400 hover:text-white hover:bg-white/10"
                                disabled={matches.length === 0}
                                onClick={nextMatch}
                                title="Next Match (Enter)"
                            >
                                <ArrowDown size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1">
                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    <button
                        className="btn btn-xs btn-ghost btn-square rounded-sm h-7 min-h-0 opacity-50 hover:opacity-100 text-gray-300 hover:bg-white/10"
                        onClick={handleDownload}
                        disabled={logs.length === 0}
                        title="Download Log"
                    >
                        <Download size={14} />
                    </button>

                    <button
                        className={clsx("btn btn-xs btn-ghost btn-square rounded-sm h-7 min-h-0 hover:bg-white/10", isWrap ? "text-blue-400" : "text-gray-500")}
                        onClick={() => setIsWrap(!isWrap)}
                        title="Toggle Word Wrap"
                    >
                        <WrapText size={14} />
                    </button>

                    <button
                        className={clsx("btn btn-xs btn-ghost btn-square rounded-sm h-7 min-h-0 hover:bg-white/10", isAutoScroll ? "text-green-400" : "text-gray-500")}
                        onClick={() => {
                            const newState = !isAutoScroll;
                            setIsAutoScroll(newState);
                            if (newState) {
                                virtuosoRef.current?.scrollToIndex({ index: displayLogs.length - 1, behavior: 'smooth' });
                            }
                        }}
                        title="Auto-scroll (Tail)"
                    >
                        <ArrowDown size={14} />
                    </button>

                    <button
                        className="btn btn-xs btn-ghost btn-square text-red-400/70 hover:text-red-400 hover:bg-white/10 rounded-sm h-7 min-h-0"
                        onClick={onClear}
                        title="Clear Console"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Virtualized Log List */}
            <div className="flex-1 min-h-0 relative group">
                <Virtuoso
                    ref={virtuosoRef}
                    data={displayLogs}
                    followOutput={isAutoScroll ? 'smooth' : false}
                    initialTopMostItemIndex={displayLogs.length - 1}
                    atBottomStateChange={(atBottom) => {
                        if (atBottom) setIsAutoScroll(true);
                        else setIsAutoScroll(false);
                    }}
                    itemContent={(index, log) => {
                        // Check if this row is the current match
                        const isCurrentMatch = searchMode === 'find' && matches[currentMatchIndex] === index;

                        return (
                            <div className={clsx(
                                "px-4 py-0.5 flex gap-3 text-xs md:text-sm border-l-2 transition-colors",
                                isWrap ? "whitespace-pre-wrap break-all" : "whitespace-nowrap",
                                isCurrentMatch ? "bg-white/10 border-blue-400" : "border-transparent hover:bg-white/5"
                            )}>
                                <span className="opacity-30 select-none w-20 shrink-0 text-right font-light text-[11px] pt-[2px] font-mono text-gray-500">
                                    {log.timestamp ? log.timestamp.split('T')[1].split('.')[0] : ''}
                                </span>
                                <span className="flex-1 font-mono">
                                    {renderMessage(log.message || '', log.type || '')}
                                </span>
                            </div>
                        );
                    }}
                    className="no-scrollbar"
                />

                {logs.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none select-none gap-2">
                        <Terminal size={48} className="text-white" />
                        <div className="text-sm font-bold uppercase tracking-widest text-white">Console Empty</div>
                    </div>
                )}

                {/* Scroll To Bottom Button (Floating) - Only show if not auto-scrolling */}
                {!isAutoScroll && (
                    <button
                        className="absolute bottom-4 right-6 btn btn-circle btn-xs btn-primary shadow-lg opacity-80 hover:opacity-100 animate-bounce"
                        onClick={() => { setIsAutoScroll(true); virtuosoRef.current?.scrollToIndex({ index: displayLogs.length - 1, behavior: 'smooth' }); }}
                    >
                        <ArrowDown size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};
