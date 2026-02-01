import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Script } from '../store';
import { Search, Monitor, Smartphone, X, Play, Square, Terminal, ChevronRight, ChevronLeft, MoreVertical } from 'lucide-react';
import clsx from 'clsx';

const API_Base = 'http://localhost:8080/api';
const WS_Base = 'ws://localhost:8080/ws/logs';

export const ExecutionView: React.FC = () => {
    const { t } = useTranslation();
    const {
        scriptTabs, activeScriptTabId,
        openScriptTab, closeScriptTab, setActiveScriptTab,
        updateScriptStatus, appendLog, setSubTab
    } = useAppStore();

    const [scripts, setScripts] = useState<Script[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    const wsMap = useRef<Map<string, WebSocket>>(new Map());
    const logEndRef = useRef<HTMLDivElement>(null);

    // Fetch scripts
    useEffect(() => {
        const fetchScripts = async () => {
            try {
                const res = await axios.get(`${API_Base}/scripts`);
                setScripts(res.data);
            } catch (err) {
                console.error("Failed to fetch scripts", err);
                setScripts([
                    { id: 'robot', name: 'Robot Script (Desktop)', platform: 'desktop' },
                    { id: 'gear', name: 'Gear Script', platform: 'android' }
                ]);
            }
        };
        fetchScripts();
    }, []);

    // Auto-scroll logs
    // Optimize: only scroll if active tab's logs changed
    const activeTab = scriptTabs.find(t => t.id === activeScriptTabId);
    useEffect(() => {
        if (activeTab && activeTab.activeSubTab === 'logs' && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeTab?.logs.length, activeTab?.activeSubTab]);

    const filteredScripts = scripts.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRun = async (scriptId: string) => {
        updateScriptStatus(scriptId, 'running');
        try {
            const res = await axios.post(`${API_Base}/run`, {
                scriptId: scriptId,
                params: "{}"
            });
            const runId = res.data.runId;
            updateScriptStatus(scriptId, 'running', runId);

            // Connect WS
            if (wsMap.current.has(scriptId)) {
                wsMap.current.get(scriptId)?.close();
            }

            const ws = new WebSocket(`${WS_Base}/${runId}`);
            wsMap.current.set(scriptId, ws);

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
                    const { timestamp, ...logData } = parsed;
                    appendLog(scriptId, logData);

                    if (parsed.type === 'status' && parsed.message === 'Process exited') {
                        updateScriptStatus(scriptId, 'stopped');
                    }
                } catch (e) {
                    appendLog(scriptId, { type: 'stdout', message: event.data });
                }
            };

        } catch (err) {
            updateScriptStatus(scriptId, 'error');
            appendLog(scriptId, { type: 'error', message: 'Failed to start: ' + err });
        }
    };

    const handleStop = async (scriptId: string) => {
        updateScriptStatus(scriptId, 'stopped');
        // Implement actual stop API call with runId if needed
    };

    return (
        <div className="flex h-full w-full bg-base-100 overflow-hidden">
            {/* Left Drawer: Script List */}
            <div className={clsx(
                "flex flex-col bg-base-200 border-r border-base-300 transition-all duration-300 ease-in-out relative",
                isDrawerOpen ? "w-72" : "w-12"
            )}>
                {/* Drawer Toggle */}
                <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className="absolute -right-3 top-4 z-20 btn btn-xs btn-circle btn-primary shadow-md"
                >
                    {isDrawerOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                </button>

                {isDrawerOpen ? (
                    <>
                        <div className="p-4 border-b border-base-300">
                            <h2 className="text-sm font-bold uppercase opacity-50 mb-2">{t('ui.execution.scriptList')}</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                                <input
                                    type="text"
                                    placeholder={t('ui.execution.searchData')}
                                    className="input input-sm input-bordered w-full pl-9 rounded-md"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredScripts.length === 0 && (
                                <div className="text-center text-sm opacity-50 py-4">{t('ui.execution.noScripts')}</div>
                            )}
                            {filteredScripts.map(script => (
                                <div
                                    key={script.id}
                                    onDoubleClick={() => openScriptTab(script.id)}
                                    className="group flex items-center gap-3 p-2.5 rounded-md hover:bg-base-100 cursor-pointer select-none transition-colors"
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded flex items-center justify-center shrink-0",
                                        script.platform === 'android' ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                                    )}>
                                        {script.platform === 'android' ? <Smartphone size={16} /> : <Monitor size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{script.name}</div>
                                        <div className="text-[10px] opacity-40 uppercase tracking-wider">{script.platform}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center pt-4 gap-4 opacity-50">
                        <MoreVertical size={20} />
                    </div>
                )}
            </div>

            {/* Right Side: Workspace */}
            <div className="flex-1 flex flex-col min-w-0 bg-base-100">
                {/* Tabs Header */}
                <div className="flex items-center bg-base-200 border-b border-base-300 pt-1 px-1 gap-1 overflow-x-auto no-scrollbar h-10 shrink-0">
                    {scriptTabs.map(tab => {
                        const script = scripts.find(s => s.id === tab.id);
                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveScriptTab(tab.id)}
                                className={clsx(
                                    "relative flex items-center gap-2 px-4 h-9 max-w-[200px] rounded-t-md text-xs font-medium cursor-pointer select-none transition-all border-t border-x border-transparent",
                                    activeScriptTabId === tab.id
                                        ? "bg-base-100 text-base-content border-base-300 !border-b-base-100 mb-[-1px] z-10"
                                        : "bg-transparent text-base-content/60 hover:bg-base-100/50"
                                )}
                            >
                                <span className={clsx(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    tab.status === 'running' ? "bg-success animate-pulse" :
                                        tab.status === 'error' ? "bg-error" : "bg-base-content/20"
                                )} />
                                <span className="truncate flex-1">{script?.name || tab.id}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeScriptTab(tab.id); }}
                                    className="p-0.5 rounded hover:bg-base-content/10 opacity-60 hover:opacity-100"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab ? (
                        <div className="flex h-full w-full">
                            {/* Inner Sub-Tabs / Split View - Simplified to vertical split for now as per V2 spec suggestion */}
                            {/* User asked for Script Detail (Control/Logs) as SubTabs */}

                            <div className="flex flex-col w-full h-full">
                                {/* Sub Toolbar */}
                                <div className="h-12 border-b border-base-300 flex items-center px-4 justify-between bg-base-100">
                                    <div className="tabs tabs-boxed tabs-sm bg-base-200">
                                        <a
                                            className={`tab ${activeTab.activeSubTab === 'control' ? 'tab-active' : ''}`}
                                            onClick={() => setSubTab(activeTab.id, 'control')}
                                        >
                                            {t('ui.execution.params')}
                                        </a>
                                        <div className="divider divider-horizontal mx-0 my-1 w-[1px]"></div>
                                        <a
                                            className={`tab ${activeTab.activeSubTab === 'logs' ? 'tab-active' : ''}`}
                                            onClick={() => setSubTab(activeTab.id, 'logs')}
                                        >
                                            {t('ui.execution.console')}
                                        </a>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {activeTab.status === 'running' ? (
                                            <button
                                                className="btn btn-sm btn-error gap-2"
                                                onClick={() => handleStop(activeTab.id)}
                                            >
                                                <Square size={14} fill="currentColor" /> {t('ui.execution.stop')}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-sm btn-primary gap-2"
                                                onClick={() => handleRun(activeTab.id)}
                                            >
                                                <Play size={14} fill="currentColor" /> {t('ui.execution.start')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* View Content */}
                                <div className="flex-1 overflow-hidden bg-base-200/30 p-4">
                                    {activeTab.activeSubTab === 'control' && (
                                        <div className="card bg-base-100 shadow-sm border border-base-200 h-full max-w-2xl mx-auto">
                                            <div className="card-body">
                                                <h3 className="card-title text-sm opacity-50 uppercase tracking-widest mb-4">Configuration</h3>
                                                <div className="space-y-4">
                                                    <div className="form-control w-full">
                                                        <label className="label">
                                                            <span className="label-text">Target Device ID</span>
                                                        </label>
                                                        <input type="text" placeholder="Type here" className="input input-bordered w-full" />
                                                    </div>

                                                    <div className="form-control">
                                                        <label className="label cursor-pointer justify-start gap-4">
                                                            <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                                                            <span className="label-text">Enable Hardware Acceleration</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab.activeSubTab === 'logs' && (
                                        <div className="h-full bg-[#1e1e1e] rounded-lg shadow-inner overflow-hidden flex flex-col font-mono text-sm border border-base-300">
                                            <div className="flex-none bg-[#252526] px-3 py-1.5 flex items-center justify-between border-b border-[#333]">
                                                <div className="flex items-center gap-2 text-xs text-[#cccccc]">
                                                    <Terminal size={12} />
                                                    <span>Console Output</span>
                                                </div>
                                                <div className="text-[10px] text-[#666]">Read-only</div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                                                {activeTab.logs.map((log, i) => (
                                                    <div key={i} className="flex gap-2 text-[#cccccc] hover:bg-[#2a2d2e]">
                                                        <span className="opacity-30 select-none text-xs w-16 text-right shrink-0">
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false }) : ''}
                                                        </span>
                                                        <span className={clsx(
                                                            "break-all whitespace-pre-wrap",
                                                            log.type === 'error' ? "text-[#f48771]" :
                                                                log.type === 'status' ? "text-[#75beff]" :
                                                                    log.type === 'stderr' ? "text-[#dcdcaa]" : "text-[#cccccc]"
                                                        )}>
                                                            {log.message || JSON.stringify(log)}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div ref={logEndRef} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-base-content/20 gap-4">
                            <Monitor size={64} strokeWidth={1} />
                            <p className="font-medium text-lg">{t('ui.execution.noScripts')}</p>
                            <span className="text-sm">Double click a script on the left to start</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
