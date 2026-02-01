import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Script } from '../store';
import {
    Play, Square, Search, X, Monitor, Smartphone,
    Terminal, Sliders, ChevronRight, ChevronLeft
} from 'lucide-react';
import clsx from 'clsx';

const API_Base = 'http://localhost:8080/api';
const WS_Base = 'ws://localhost:8080/ws/logs';

// Mock Data (Fallback)
const MOCK_SCRIPTS = [
    { id: 'robot', name: 'Robot Script (Desktop)', platform: 'desktop', description: 'Automates desktop GUI interactions' },
    { id: 'gear', name: 'Gear Script', platform: 'android', description: 'Farms gear in mobile game' },
    { id: 'evil_hunter', name: 'Evil Hunter', platform: 'android', description: 'Auto-combat script' },
    { id: 'chaos_dream', name: 'Chaos Dream', platform: 'android', description: 'Dungeon crawler bot' },
    { id: 'adb_test', name: 'ADB Test', platform: 'android', description: 'Connectivity check' },
];

export const ExecutionView: React.FC = () => {
    const { t } = useTranslation();
    const {
        scriptTabs, activeTabId,
        openScriptTab, closeScriptTab, setActiveScriptTab, setSubTab,
        updateScriptStatus, appendLog, renameScriptTab
    } = useAppStore();

    // UI State
    const [scripts, setScripts] = useState<Script[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    // Renaming State
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Backend Connection Refs
    const wsMap = useRef<Map<string, WebSocket>>(new Map()); // Key is tabId now
    const logEndRef = useRef<HTMLDivElement>(null);

    // Fetch scripts
    useEffect(() => {
        const fetchScripts = async () => {
            try {
                const res = await axios.get(`${API_Base}/scripts`);
                setScripts(res.data);
            } catch (err) {
                console.error("Failed to fetch scripts", err);
                setScripts(MOCK_SCRIPTS as any);
            }
        };
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
        updateScriptStatus(tabId, 'running');
        try {
            const res = await axios.post(`${API_Base}/run`, { scriptId: scriptId, params: "{}" });
            const runId = res.data.runId;
            updateScriptStatus(tabId, 'running', runId);

            // Close existing WS for this TAB instance if any
            if (wsMap.current.has(tabId)) {
                wsMap.current.get(tabId)?.close();
            }

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
        } catch (err) {
            updateScriptStatus(tabId, 'error');
            appendLog(tabId, { type: 'error', message: 'Failed to start: ' + err });
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
            <div className="flex-1 flex flex-col min-w-0 bg-base-200/30">
                {/* Tabs Header (Instances) */}
                <div className="flex items-center gap-2 px-2 pt-2 bg-base-100 border-b border-base-200 overflow-x-auto no-scrollbar">
                    {scriptTabs.map(tab => {
                        const isActive = activeTabId === tab.tabId;
                        const isEditing = editingTabId === tab.tabId;

                        return (
                            <div
                                key={tab.tabId}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-t border-x border-b-0 text-sm font-medium cursor-pointer select-none transition-colors min-w-[160px] max-w-[240px] group",
                                    isActive
                                        ? "bg-base-100 border-base-200 text-base-content relative top-[1px] shadow-sm"
                                        : "bg-base-200/50 border-transparent text-base-content/50 hover:bg-base-200 hover:text-base-content/80"
                                )}
                                onClick={() => setActiveScriptTab(tab.tabId)}
                                onDoubleClick={(e) => { e.stopPropagation(); startEditing(tab.tabId, tab.label); }}
                            >
                                <span className={clsx("w-2 h-2 rounded-full shrink-0",
                                    tab.status === 'running' ? "bg-success animate-pulse" :
                                        tab.status === 'error' ? "bg-error" : "bg-base-content/20"
                                )} />

                                {isEditing ? (
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        className="input input-xs input-ghost h-auto p-0 flex-1 min-w-0 bg-transparent focus:outline-none font-medium"
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
                                    className="opacity-0 group-hover:opacity-100 hover:bg-base-content/10 rounded-full p-0.5 transition-all"
                                    onClick={(e) => { e.stopPropagation(); closeScriptTab(tab.tabId); }}
                                >
                                    <X size={12} />
                                </button>
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
                                                    <input type="text" placeholder="Type here" className="input input-bordered w-full" />
                                                </div>
                                                <div className="form-control w-52">
                                                    <label className="label cursor-pointer justify-start gap-3">
                                                        <input type="checkbox" className="toggle toggle-primary toggle-sm" defaultChecked />
                                                        <span className="label-text">Enable Hardware Acceleration</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col font-mono text-sm bg-[#1e1e1e] text-gray-300">
                                        <div className="flex-1 p-4 space-y-0.5 overflow-y-auto font-mono text-xs md:text-sm">
                                            {activeTab.logs.map((log, i) => (
                                                <div key={i} className="flex gap-3 hover:bg-white/5 -mx-2 px-2 py-0.5 rounded-sm">
                                                    <span className="opacity-40 select-none w-24 shrink-0 text-right font-light">{log.timestamp.split('T')[1].split('.')[0]}</span>
                                                    <span className={clsx(
                                                        "break-all",
                                                        log.type === 'error' ? "text-red-400 font-bold" :
                                                            log.type === 'status' ? "text-blue-400 font-bold" :
                                                                log.type === 'success' ? "text-green-400 font-bold" :
                                                                    log.type === 'warning' ? "text-yellow-400" :
                                                                        "text-gray-300"
                                                    )}>{log.message}</span>
                                                </div>
                                            ))}
                                            {activeTab.logs.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 select-none gap-2">
                                                    <Terminal size={32} />
                                                    <div>Ready for output</div>
                                                </div>
                                            )}
                                            {activeTab.status === 'running' && (
                                                <div className="animate-pulse text-green-500 font-bold mt-2">_</div>
                                            )}
                                            <div ref={logEndRef} />
                                        </div>
                                    </div>
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
        </div>
    );
};
