import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import {
    Play, Square, Search, X, Monitor, Smartphone,
    Terminal, Sliders, ChevronRight, ChevronLeft
} from 'lucide-react';
import clsx from 'clsx';

// Mock Data
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
        scriptTabs, activeScriptTabId,
        openScriptTab, closeScriptTab, setActiveScriptTab, setSubTab,
        updateScriptStatus
    } = useAppStore();

    // UI State
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [scripts] = useState(MOCK_SCRIPTS);

    // Derived
    const filteredScripts = scripts.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const activeTab = scriptTabs.find(t => t.id === activeScriptTabId);

    return (
        <div className="flex h-full bg-base-100 overflow-hidden relative">

            {/* Script List Drawer */}
            <div
                className={clsx(
                    "bg-base-100 border-r border-base-200 flex flex-col shrink-0 transition-all duration-300 relative",
                    isDrawerOpen ? "w-64" : "w-16"
                )}
            >
                {/* Drawer Header */}
                <div className={clsx("h-14 flex items-center border-b border-base-200 overflow-hidden", isDrawerOpen ? "px-4" : "justify-center px-0")}>
                    {isDrawerOpen ? (
                        <div className="font-bold text-xs uppercase opacity-50 tracking-wider">Script List</div>
                    ) : (
                        <div className="font-bold text-xs uppercase opacity-50">List</div>
                    )}
                </div>

                {/* Search (Only visible when open) */}
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

                {/* List Items */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    {filteredScripts.map(script => (
                        <div
                            key={script.id}
                            className={clsx(
                                "group flex items-center gap-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent select-none",
                                isDrawerOpen ? "p-3 hover:bg-base-200" : "p-2 justify-center hover:bg-base-200 aspect-square"
                            )}
                            onDoubleClick={() => openScriptTab(script.id)}
                            title={!isDrawerOpen ? script.name : undefined}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                script.platform === 'android' ? "bg-success/10 text-success" : "bg-info/10 text-info"
                            )}>
                                {script.platform === 'android' ? <Smartphone size={18} /> : <Monitor size={18} />}
                            </div>

                            {/* Text Content */}
                            <div className={clsx("flex-1 min-w-0 transition-opacity duration-200", isDrawerOpen ? "opacity-100" : "opacity-0 w-0 hidden")}>
                                <div className="font-medium text-sm truncate leading-tight">{script.name}</div>
                                <div className="text-[10px] opacity-50 uppercase font-bold mt-0.5">{script.platform}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Collapse Toggle (Bottom Full Width) */}
                <div className="border-t border-base-200">
                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        className="w-full h-10 flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-base-200 transition-all cursor-pointer"
                        title={isDrawerOpen ? "Collapse List" : "Expand List"}
                    >
                        {isDrawerOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {/* Workspace Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-base-200/30">
                {/* Tabs Header */}
                <div className="flex items-center gap-2 px-2 pt-2 bg-base-100 border-b border-base-200 overflow-x-auto no-scrollbar">
                    {scriptTabs.map(tab => {
                        const script = scripts.find(s => s.id === tab.id);
                        const isActive = activeScriptTabId === tab.id;
                        return (
                            <div
                                key={tab.id}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-t border-x border-b-0 text-sm font-medium cursor-pointer select-none transition-colors min-w-[160px] max-w-[240px]",
                                    isActive
                                        ? "bg-base-200/30 border-base-200 text-base-content relative top-[1px]"
                                        : "bg-base-100 border-transparent text-base-content/50 hover:bg-base-200/50 hover:text-base-content/80"
                                )}
                                onClick={() => setActiveScriptTab(tab.id)}
                            >
                                <span className={clsx("w-2 h-2 rounded-full",
                                    tab.status === 'running' ? "bg-success animate-pulse" : "bg-base-content/20"
                                )} />
                                <span className="truncate flex-1">{script?.name || tab.id}</span>
                                <button
                                    className="opacity-80 group-hover:opacity-100 hover:bg-base-content/10 rounded-full p-0.5 transition-all"
                                    onClick={(e) => { e.stopPropagation(); closeScriptTab(tab.id); }}
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
                                            onClick={() => setSubTab(activeTab.id, 'control')}
                                        >
                                            <Sliders size={14} /> <span className="hidden sm:inline">{t('ui.execution.params')}</span>
                                        </button>
                                        <button
                                            className={clsx("btn btn-sm join-item border-none shadow-none", activeTab.activeSubTab === 'logs' ? "btn-primary" : "btn-ghost")}
                                            onClick={() => setSubTab(activeTab.id, 'logs')}
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
                                    <button className="btn btn-sm btn-error" disabled={activeTab.status !== 'running'} onClick={() => updateScriptStatus(activeTab.id, 'stopped')}>
                                        <Square size={14} fill="currentColor" /> {t('ui.execution.stop')}
                                    </button>
                                    <button className="btn btn-sm btn-success" disabled={activeTab.status === 'running'} onClick={() => updateScriptStatus(activeTab.id, 'running')}>
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
                                    <div className="h-full flex flex-col font-mono text-sm">
                                        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                                            {activeTab.logs.map((log, i) => (
                                                <div key={i} className="flex gap-2 hover:bg-base-200/50 -mx-2 px-2 py-0.5 rounded">
                                                    <span className="opacity-30 select-none text-xs w-20 shrink-0 text-right">{log.timestamp.split('T')[1].split('.')[0]}</span>
                                                    <span className={clsx(
                                                        log.type === 'error' ? "text-error font-bold" :
                                                            log.type === 'status' ? "text-info" : ""
                                                    )}>{log.message}</span>
                                                </div>
                                            ))}
                                            {activeTab.logs.length === 0 && (
                                                <div className="h-full flex items-center justify-center opacity-20">
                                                    No logs available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                            <Monitor size={48} className="mb-4" />
                            <div className="font-bold text-lg">No Script Selected</div>
                            <p className="text-sm">Select a script from the list to begin</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
