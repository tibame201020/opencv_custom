import React, { useEffect, useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Save, Play, FileCode, Plus, Trash2, Camera, HelpCircle, ChevronLeft, ChevronRight, X, File, FileCheck, RefreshCw, Activity } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScreenshotModal } from '../components/ScreenshotModal';
import { ApiRefModal } from '../components/ApiRefModal';
import { AssetExplorer } from '../components/AssetExplorer';
import { registerPythonCompletions } from '../utils/monacoConfig';

import clsx from 'clsx';


export const EditorView: React.FC = () => {
    const { t } = useTranslation();
    const {
        openScriptTab, theme,
        editorSelectedScriptId, setEditorSelectedScriptId,
        editorTabs, activeEditorTabId, openEditorTab, closeEditorTab, setActiveEditorTab, updateEditorTabContent, saveEditorTab,
        assetExplorerCollapsed, setAssetExplorerCollapsed,
        scriptExplorerCollapsed, setScriptExplorerCollapsed,
        apiBaseUrl, scripts, devices, fetchScripts, fetchDevices
    } = useAppStore();

    const API_Base = apiBaseUrl;
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);

    // Create Script Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newScriptName, setNewScriptName] = useState("");
    const [newScriptPlatform, setNewScriptPlatform] = useState("android");
    const [isCreating, setIsCreating] = useState(false);

    // Android Workflow State
    const [selectedDevice, setSelectedDevice] = useState<string>("");
    const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

    // Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isApiRefModalOpen, setIsApiRefModalOpen] = useState(false);

    // Asset Explorer State
    const [assetExplorerWidth, setAssetExplorerWidth] = useState(250);
    const [assetRefreshTrigger, setAssetRefreshTrigger] = useState(0);
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

    const editorRef = useRef<any>(null);
    const activeTab = editorTabs.find(t => t.id === activeEditorTabId);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'info' | 'error'>('info');

    const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };


    // When project changes, if no tab is open for it, open main.py
    useEffect(() => {
        if (editorSelectedScriptId) {
            const projectTabs = editorTabs.filter(t => t.scriptId === editorSelectedScriptId);
            if (projectTabs.length === 0) {
                fetchAndOpenMain(editorSelectedScriptId);
            } else if (!activeEditorTabId || editorTabs.find(t => t.id === activeEditorTabId)?.scriptId !== editorSelectedScriptId) {
                // If the global active tab belongs to another project, try to activate the first tab of current project
                setActiveEditorTab(projectTabs[0].id);
            }
        }
    }, [editorSelectedScriptId, editorTabs, activeEditorTabId, setActiveEditorTab]);

    const fetchAndOpenMain = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_Base}/scripts/${id}/content`);
            if (!res.ok) {
                if (res.status === 404) {
                    console.warn("Main content not found, script might be deleted.");
                    setEditorSelectedScriptId(null);
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            openEditorTab(id, `${id}.py`, `${id}.py`, data.content, 'code');
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenFile = async (path: string) => {
        if (!editorSelectedScriptId) return;

        // Check if already open
        const existingId = `${editorSelectedScriptId}/${path}`;
        if (editorTabs.find(t => t.id === existingId)) {
            setActiveEditorTab(existingId);
            return;
        }

        const isImage = /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(path);
        const isWorkflow = path.endsWith('.wf') || path.startsWith('workflow:');

        if (isWorkflow) {
            setIsLoading(true);
            try {
                let wfData;
                let content;
                let name;

                if (path.startsWith('workflow:')) {
                    const wfId = path.split(':')[1];
                    const res = await fetch(`${API_Base}/workflows/${wfId}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    wfData = await res.json();
                    content = JSON.stringify(wfData, null, 2);
                    name = wfData.name;
                } else {
                    const res = await fetch(`${API_Base}/scripts/${editorSelectedScriptId}/content?path=${encodeURIComponent(path)}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    content = data.content;
                    name = path.split('/').pop() || path;
                    try { wfData = JSON.parse(data.content); } catch (e) { wfData = { nodes: [], edges: [] }; }
                }

                const tabId = path.startsWith('workflow:') ? path : `${editorSelectedScriptId}/${path}`;

                // Check if already open
                const existing = editorTabs.find(t => t.id === tabId);
                if (existing) {
                    setActiveEditorTab(tabId);
                    return;
                }

                useAppStore.setState(state => ({
                    editorTabs: [...state.editorTabs, {
                        id: tabId,
                        scriptId: editorSelectedScriptId || 'workflows',
                        name,
                        path,
                        type: 'workflow',
                        content,
                        originalContent: content,
                        isDirty: false,
                        workflowData: wfData
                    }],
                    activeEditorTabId: tabId,
                    activeEditorTabIdPerProject: {
                        ...state.activeEditorTabIdPerProject,
                        [editorSelectedScriptId || 'workflows']: tabId
                    }
                }));
            } catch (err) {
                console.error("Failed to open workflow", err);
                showToast("Failed to load workflow", "error");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (isImage) {
            // For images, the "content" is the URL
            const imageUrl = `${API_Base}/scripts/${editorSelectedScriptId}/content?path=${encodeURIComponent(path)}&raw=true`;
            openEditorTab(editorSelectedScriptId, path, path.split('/').pop() || path, imageUrl, 'image');
            return;
        }

        setIsLoading(true);
        try {
            const url = isImage
                ? `${API_Base}/scripts/${editorSelectedScriptId}/content?path=${encodeURIComponent(path)}&raw=true`
                : `${API_Base}/scripts/${editorSelectedScriptId}/content?path=${encodeURIComponent(path)}`;

            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) {
                    // Close tab if file is missing
                    closeEditorTab(existingId);
                    showToast?.(t('ui.common.error') + ": File not found", 'error');
                }
                throw new Error(`HTTP ${res.status}`);
            }

            if (isImage) {
                openEditorTab(editorSelectedScriptId, path, path.split('/').pop() || path, url, 'image');
            } else {
                const data = await res.json();
                openEditorTab(editorSelectedScriptId, path, path.split('/').pop() || path, data.content, 'code');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!activeTab || activeTab.type === 'image') return;
        const currentCode = editorRef.current?.getValue(); // Use optional chaining for editorRef.current

        try {
            if (activeTab.type === 'workflow' && activeTab.id.startsWith('workflow:')) {
                const wfId = activeTab.id.split(':')[1];
                const res = await fetch(`${API_Base}/workflows/${wfId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: activeTab.content
                });
                if (!res.ok) throw new Error("API Save failed");
            } else {
                const url = activeTab.path
                    ? `${API_Base}/scripts/${activeTab.scriptId}/content?path=${encodeURIComponent(activeTab.path)}`
                    : `${API_Base}/scripts/${activeTab.scriptId}/content`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: currentCode })
                });
                if (!res.ok) throw new Error("File Save failed");
            }
            saveEditorTab(activeTab.id);
            showToast(t('ui.editor.saveSuccess', 'File saved!'), 'info'); // Changed type to 'info' for success
        } catch (err) {
            console.error("Failed to save", err);
            showToast(t('ui.common.error'), 'error');
        }
    };

    const handleDeleteScript = () => {
        if (!editorSelectedScriptId) return;
        setIsDeleteModalOpen(true);
    };

    const executeDeleteScript = async () => {
        if (!editorSelectedScriptId) return;
        try {
            const res = await fetch(`${API_Base}/scripts/${editorSelectedScriptId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // Success: close all tabs related to this script
            editorTabs.filter(t => t.scriptId === editorSelectedScriptId).forEach(t => closeEditorTab(t.id));
            setEditorSelectedScriptId(null);
            fetchScripts();
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            console.error("Failed to delete", err);
            showToast(t('ui.common.error') + ": " + (err.message), 'error');
        }
    };

    const handleCreateScript = async () => {
        if (!newScriptName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch(`${API_Base}/scripts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newScriptName,
                    platform: newScriptPlatform
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            await fetchScripts();
            setIsModalOpen(false);
            setNewScriptName("");
            setNewScriptPlatform("android");
        } catch (err: any) {
            console.error("Failed to create script", err);
            showToast(t('ui.common.error') + ": " + (err.message), 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        registerPythonCompletions(monaco);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            handleSave();
        });
    };

    const handleRun = () => {
        if (editorSelectedScriptId) {
            openScriptTab(editorSelectedScriptId);
            navigate('/execution');
        }
    };

    const currentProject = scripts.find(s => s.id === editorSelectedScriptId);

    return (
        <div className="flex h-full bg-base-100">
            {/* Project List Sidebar */}
            <div className={clsx(
                "border-r border-base-300 flex flex-col bg-base-200 transition-all duration-300 ease-in-out",
                scriptExplorerCollapsed ? 'w-12' : 'w-64'
            )}>
                <div className={clsx("p-4 font-bold text-lg flex items-center shrink-0", scriptExplorerCollapsed ? 'justify-center p-2' : 'justify-between')}>
                    {scriptExplorerCollapsed ? (
                        <button className="btn btn-sm btn-ghost btn-square" onClick={() => setScriptExplorerCollapsed(false)}><ChevronRight size={20} /></button>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setScriptExplorerCollapsed(true)}>
                                <FileCode size={20} className="shrink-0 text-primary" />
                                <span className="truncate">Projects</span>
                            </div>
                            <div className="flex gap-1">
                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => setIsModalOpen(true)}><Plus size={16} /></button>
                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => setScriptExplorerCollapsed(true)}><ChevronLeft size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
                {!scriptExplorerCollapsed && (
                    <div className="flex-1 overflow-y-auto">
                        <ul className="menu w-full p-2 gap-1">
                            {scripts.map(script => (
                                <li key={script.id}>
                                    <a
                                        className={clsx(
                                            "flex items-center gap-2 rounded-lg transition-all",
                                            editorSelectedScriptId === script.id ? 'active bg-primary/10 text-primary font-bold shadow-sm' : 'hover:bg-base-300'
                                        )}
                                        onClick={() => setEditorSelectedScriptId(script.id)}
                                    >
                                        <div className={clsx("badge badge-xs uppercase font-mono px-1 h-4", script.platform === 'android' ? 'badge-secondary' : 'badge-neutral')}>
                                            {script.platform.charAt(0)}
                                        </div>
                                        <span className="truncate">{script.name}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {scriptExplorerCollapsed && (
                    <div className="flex-1 flex flex-col items-center py-2 gap-2 overflow-y-auto scrollbar-hide">
                        {scripts.map(script => (
                            <button
                                key={script.id}
                                className={clsx("btn btn-sm btn-square", editorSelectedScriptId === script.id ? 'btn-primary' : 'btn-ghost')}
                                onClick={() => setEditorSelectedScriptId(script.id)}
                                title={script.name}
                            >
                                <span className="text-[10px] font-bold">{script.name.charAt(0).toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Project Contextual Explorer */}
            {editorSelectedScriptId && (
                <AssetExplorer
                    scriptId={editorSelectedScriptId}
                    width={assetExplorerCollapsed ? 40 : assetExplorerWidth}
                    collapsed={assetExplorerCollapsed}
                    refreshKey={assetRefreshTrigger}
                    onToggle={() => setAssetExplorerCollapsed(!assetExplorerCollapsed)}
                    onResize={setAssetExplorerWidth}
                    onFileOpen={handleOpenFile}
                />
            )}

            {/* Main IDE-Style Editor Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* 1. Project Navigation & Global Actions */}
                <header className="h-10 border-b border-base-300 flex items-center px-4 gap-4 bg-base-100 shrink-0 z-10">
                    {editorSelectedScriptId ? (
                        <>
                            <div className="flex items-center gap-1.5 overflow-hidden shrink-0">
                                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Project /</span>
                                <span className="text-sm font-bold truncate max-w-[200px]">{currentProject?.name}</span>
                            </div>

                            <div className="h-4 w-px bg-base-300 mx-2" />

                            <div className="flex items-center gap-2 flex-1">
                                <button className="btn btn-xs btn-primary gap-1.5 h-7 px-3" onClick={handleRun}>
                                    <Play size={12} fill="currentColor" /> Run
                                </button>

                                {currentProject?.platform === 'android' && (
                                    <div className="join border border-base-300 rounded-md bg-base-200/50">
                                        <select
                                            className="select select-xs join-item font-mono text-[10px] h-7 min-h-0 bg-transparent border-none focus:outline-none"
                                            value={selectedDevice}
                                            onChange={(e) => setSelectedDevice(e.target.value)}
                                            onClick={() => { if (devices.length === 0) fetchDevices(); }}
                                        >
                                            <option value="" disabled>Device</option>
                                            {devices?.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <button
                                            className="btn btn-xs join-item btn-ghost h-7 w-8"
                                            onClick={() => handleRefreshDevices()}
                                            title="Refresh Devices"
                                        >
                                            <RefreshCw size={12} className={clsx(isRefreshingDevices && "animate-spin")} />
                                        </button>
                                        <button className="btn btn-xs join-item btn-ghost h-7 w-8" onClick={() => setIsScreenshotModalOpen(true)} disabled={!selectedDevice}>
                                            <Camera size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="btn btn-xs btn-ghost gap-1.5 text-info h-7" onClick={() => setIsApiRefModalOpen(true)}>
                                    <HelpCircle size={14} /> Ref
                                </button>
                                <button className="btn btn-xs btn-ghost btn-square text-error h-7 w-7" onClick={handleDeleteScript}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-xs opacity-50 italic">Select a project to begin</div>
                    )}
                </header>

                <div className="h-9 bg-base-200 border-b border-base-300 flex items-center overflow-x-auto overflow-y-hidden no-scrollbar shrink-0">
                    {editorTabs.filter(t => t.scriptId === editorSelectedScriptId).map(tab => (
                        <div
                            key={tab.id}
                            className={clsx(
                                "flex items-center gap-2 px-3 h-full border-r border-base-300 cursor-pointer text-xs transition-all relative group select-none min-w-[120px] max-w-[240px]",
                                activeEditorTabId === tab.id ? "bg-base-100 font-bold border-t-2 border-t-primary" : "hover:bg-base-300 opacity-60"
                            )}
                            onClick={() => setActiveEditorTab(tab.id)}
                        >
                            <File size={12} className={clsx(tab.isDirty ? "text-warning" : "text-base-content/40")} />
                            <span className="truncate flex-1">{tab.name}</span>
                            <div className="w-4 h-4 flex items-center justify-center">
                                {tab.isDirty ? (
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full group-hover:hidden" />
                                ) : null}
                                <button
                                    className={clsx("btn btn-xs btn-ghost btn-square h-4 w-4 rounded-sm transition-opacity", tab.isDirty ? "hidden group-hover:flex" : "flex opacity-0 group-hover:opacity-100")}
                                    onClick={(e) => { e.stopPropagation(); closeEditorTab(tab.id); }}
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {editorTabs.length === 0 && <span className="text-[10px] opacity-20 ml-4 font-mono">NO OPEN FILES</span>}
                </div>

                {/* 3. Editor / Workspace */}
                <div className="flex-1 relative flex flex-col">
                    {activeTab ? (
                        <>
                            {/* Inner Header for File-specific Actions */}
                            <div className="h-8 bg-base-100 border-b border-base-300 flex items-center justify-between px-4 shrink-0">
                                <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest truncate flex-1">
                                    {activeTab.path || 'main'}
                                </span>
                                <button
                                    className={clsx("btn btn-xs gap-1.5 h-6 min-h-0 px-2 font-bold", activeTab.isDirty ? "btn-success" : "btn-ghost opacity-40")}
                                    onClick={handleSave}
                                    disabled={!activeTab.isDirty}
                                >
                                    {activeTab.isDirty ? <Save size={12} /> : <FileCheck size={12} />}
                                    Save
                                </button>
                            </div>

                            <div className="flex-1 relative">
                                {isLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/50 backdrop-blur-[1px]">
                                        <span className="loading loading-spinner loading-md text-primary"></span>
                                    </div>
                                )}
                                {activeTab.type === 'image' ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-base-200 overflow-auto p-8">
                                        <div className="relative group">
                                            {/* Transparency Grid Background */}
                                            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff22 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                                            <img
                                                src={activeTab.content}
                                                alt={activeTab.name}
                                                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm relative z-10 border border-base-300"
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 font-mono">
                                                IMAGE MODE
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab.type === 'workflow' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-base-content/40 p-12 text-center">
                                        <Activity size={48} className="mb-4 opacity-20" />
                                        <div className="text-lg font-bold">Workflow Editor has moved</div>
                                        <div className="text-sm mt-2 max-w-sm">Please use the dedicated <strong>Workflow</strong> tab in the navigation bar to edit workflows.</div>
                                    </div>
                                ) : (
                                    <Editor
                                        height="100%"
                                        defaultLanguage="python"
                                        path={activeTab.id}
                                        value={activeTab.content}
                                        theme={['light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord'].includes(theme) ? "light" : "vs-dark"}
                                        onChange={(val) => updateEditorTabContent(activeTab.id, val || "")}
                                        onMount={handleEditorMount}
                                        options={{
                                            minimap: { enabled: true },
                                            fontSize: 14,
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 10 }
                                        }}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4 select-none">
                            <FileCode size={120} strokeWidth={1} />
                            <p className="text-xl font-bold font-mono tracking-tighter">SELECT A FILE TO EDIT</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals and Overlays */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">{t('ui.management.create')}</h3>
                        <div className="form-control w-full mt-4">
                            <label className="label"><span className="label-text">{t('ui.management.scriptName')}</span></label>
                            <input type="text" placeholder="my-awesome-script" className="input input-bordered w-full font-mono" value={newScriptName} onChange={e => setNewScriptName(e.target.value)} />
                            <label className="label"><span className="label-text">{t('ui.management.platform')}</span></label>
                            <select className="select select-bordered w-full font-bold" value={newScriptPlatform} onChange={e => setNewScriptPlatform(e.target.value)}>
                                <option value="android">{t('ui.management.platformAndroid')}</option>
                                <option value="desktop">{t('ui.management.platformDesktop')}</option>
                            </select>
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>{t('ui.management.cancel')}</button>
                            <button className="btn btn-primary px-8" onClick={handleCreateScript} disabled={isCreating || !newScriptName.trim()}>
                                {isCreating ? <span className="loading loading-spinner loading-xs" /> : t('ui.management.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={isDeleteModalOpen} title={t('ui.management.delete')} message={t('ui.management.deleteWarning')} onConfirm={executeDeleteScript} onCancel={() => setIsDeleteModalOpen(false)} type="danger" confirmText={t('ui.management.delete')} />
            <ScreenshotModal isOpen={isScreenshotModalOpen} onClose={() => { setIsScreenshotModalOpen(false); setAssetRefreshTrigger(prev => prev + 1); }} deviceId={selectedDevice} scriptId={editorSelectedScriptId} />
            <ApiRefModal isOpen={isApiRefModalOpen} onClose={() => setIsApiRefModalOpen(false)} />

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
