import React, { useEffect, useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import axios from 'axios';
import { useAppStore } from '../store';
import { Save, Play, FileCode, Plus, Trash2, Camera, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScreenshotModal } from '../components/ScreenshotModal';
import { ApiRefModal } from '../components/ApiRefModal';
import { AssetExplorer } from '../components/AssetExplorer';
import { registerPythonCompletions } from '../utils/monacoConfig';

const API_Base = "http://localhost:8080/api";

export const EditorView: React.FC = () => {
    const { openScriptTab, setActiveMainTab } = useAppStore();

    const [scripts, setScripts] = useState<any[]>([]);
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
    const [code, setCode] = useState<string>("");
    const [originalCode, setOriginalCode] = useState<string>("");
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Create Script Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newScriptName, setNewScriptName] = useState("");
    const [newScriptPlatform, setNewScriptPlatform] = useState("android");
    const [isCreating, setIsCreating] = useState(false);

    // Android Workflow State
    const [devices, setDevices] = useState<string[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>("");
    const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

    // Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isApiRefModalOpen, setIsApiRefModalOpen] = useState(false);

    // Asset Explorer State
    const [assetExplorerCollapsed, setAssetExplorerCollapsed] = useState(false);
    const [assetExplorerWidth, setAssetExplorerWidth] = useState(250);
    const [assetRefreshTrigger, setAssetRefreshTrigger] = useState(0);

    // Script Explorer State
    const [scriptExplorerCollapsed, setScriptExplorerCollapsed] = useState(false);

    const editorRef = useRef<any>(null);
    const selectedScriptIdRef = useRef<string | null>(selectedScriptId);

    useEffect(() => {
        selectedScriptIdRef.current = selectedScriptId;
    }, [selectedScriptId]);

    useEffect(() => {
        fetchScripts();
        fetchDevices();
    }, []);

    useEffect(() => {
        if (selectedScriptId) {
            fetchScriptContent(selectedScriptId);
        }
    }, [selectedScriptId]);

    const fetchScripts = async () => {
        try {
            const res = await axios.get(`${API_Base}/scripts`);
            setScripts(res.data);
        } catch (err) {
            console.error("Failed to fetch scripts", err);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await axios.get(`${API_Base}/devices`);
            setDevices(res.data);
            if (res.data.length > 0 && !selectedDevice) {
                setSelectedDevice(res.data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch devices", err);
        }
    };

    const fetchScriptContent = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_Base}/scripts/${id}/content`);
            setCode(res.data.content);
            setOriginalCode(res.data.content);
            setIsDirty(false);
        } catch (err) {
            console.error(err);
            setCode("# Failed to load content");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const targetId = selectedScriptIdRef.current;
        if (!targetId || !editorRef.current) return;

        const currentCode = editorRef.current.getValue();
        try {
            await axios.post(`${API_Base}/scripts/${targetId}/content`, { content: currentCode });
            setOriginalCode(currentCode);
            setIsDirty(false);
            // Refresh local state just in case
            setCode(currentCode);
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save script");
        }
    };

    const handleDeleteScript = () => {
        if (!selectedScriptId) return;
        setIsDeleteModalOpen(true);
    };

    const executeDeleteScript = async () => {
        if (!selectedScriptId) return;
        try {
            await axios.delete(`${API_Base}/scripts/${selectedScriptId}`);

            // Success
            setSelectedScriptId(null);
            setCode("");
            setOriginalCode("");
            setIsDirty(false);
            fetchScripts();
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            console.error("Failed to delete", err);
            alert("Failed to delete script: " + (err.response?.data?.error || err.message));
        }
    };

    const handleCreateScript = async () => {
        if (!newScriptName.trim()) return;
        setIsCreating(true);
        try {
            await axios.post(`${API_Base}/scripts`, {
                name: newScriptName,
                platform: newScriptPlatform
            });
            await fetchScripts(); // Refresh list
            setIsModalOpen(false);
            setNewScriptName("");
            setNewScriptPlatform("android");
        } catch (err: any) {
            console.error("Failed to create script", err);
            alert("Failed to create script: " + (err.response?.data?.error || err.message));
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Register Completions
        registerPythonCompletions(monaco);

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            handleSave();
        });
    };

    const handleRun = () => {
        if (selectedScriptId) {
            openScriptTab(selectedScriptId);
            setActiveMainTab('execution');
        }
    };

    return (
        <div className="flex h-full bg-base-100">
            {/* Sidebar - File Explorer */}
            <div className={`${scriptExplorerCollapsed ? 'w-12' : 'w-64'} border-r border-base-300 flex flex-col bg-base-200 transition-all duration-300 ease-in-out`}>
                <div className={`p-4 font-bold text-lg flex items-center ${scriptExplorerCollapsed ? 'justify-center p-2' : 'justify-between'}`}>
                    {scriptExplorerCollapsed ? (
                        <button
                            className="btn btn-sm btn-ghost btn-square"
                            onClick={() => setScriptExplorerCollapsed(false)}
                            title="Expand Explorer"
                        >
                            <ChevronRight size={20} />
                        </button>
                    ) : (
                        <>
                            <div
                                className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setScriptExplorerCollapsed(true)}
                                title="Collapse Explorer"
                            >
                                <FileCode size={20} className="shrink-0" />
                                <span className="truncate">Script Explorer</span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    className="btn btn-xs btn-ghost btn-square"
                                    onClick={() => setIsModalOpen(true)}
                                    title="New Script"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    className="btn btn-xs btn-ghost btn-square"
                                    onClick={() => setScriptExplorerCollapsed(true)}
                                    title="Collapse Explorer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {!scriptExplorerCollapsed && (
                    <div className="flex-1 overflow-y-auto">
                        <ul className="menu w-full p-2">
                            {scripts.map(script => (
                                <li key={script.id}>
                                    <a
                                        className={selectedScriptId === script.id ? 'active' : ''}
                                        onClick={() => {
                                            if (isDirty) {
                                                if (!confirm("You have unsaved changes. Discard them?")) return;
                                            }
                                            setSelectedScriptId(script.id);
                                        }}
                                    >
                                        <span className="font-mono text-xs opacity-70">[{script.platform}]</span>
                                        {script.name}
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
                                className={`btn btn-sm btn-square ${selectedScriptId === script.id ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    if (isDirty) {
                                        if (!confirm("You have unsaved changes. Discard them?")) return;
                                    }
                                    setSelectedScriptId(script.id);
                                }}
                                title={script.name}
                            >
                                <span className="text-[10px] font-bold">{script.name.charAt(0).toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Asset Explorer (Contextual) */}
            {selectedScriptId && (
                <AssetExplorer
                    scriptId={selectedScriptId}
                    width={assetExplorerCollapsed ? 40 : assetExplorerWidth}
                    collapsed={assetExplorerCollapsed}
                    refreshKey={assetRefreshTrigger}
                    onToggle={() => setAssetExplorerCollapsed(!assetExplorerCollapsed)}
                    onResize={(w: number) => setAssetExplorerWidth(w)}
                />
            )}

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Toolbar */}
                <div className="h-12 border-b border-base-300 flex items-center px-4 gap-4 bg-base-100">
                    {selectedScriptId ? (
                        <>
                            <div className="font-bold flex-1">
                                {scripts.find(s => s.id === selectedScriptId)?.name}
                                {isDirty && <span className="text-warning ml-2">* (Unsaved)</span>}
                            </div>

                            <button
                                className="btn btn-sm btn-primary gap-2"
                                onClick={handleSave}
                                disabled={!isDirty}
                            >
                                <Save size={16} /> Save
                            </button>
                            <button
                                className="btn btn-sm btn-ghost gap-2"
                                onClick={handleRun}
                                title="Run in Execution Tab"
                            >
                                <Play size={16} /> Run
                            </button>

                            {/* Android Tools */}
                            {scripts.find(s => s.id === selectedScriptId)?.platform === 'android' && (
                                <div className="join border border-base-300 rounded-lg">
                                    <select
                                        className="select select-sm join-item font-mono max-w-[150px] focus:outline-none"
                                        value={selectedDevice}
                                        onChange={(e) => setSelectedDevice(e.target.value)}
                                        onClick={() => { if (devices.length === 0) fetchDevices(); }}
                                        title="Select Target Device"
                                    >
                                        <option value="" disabled>Select Device</option>
                                        {devices.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <button
                                        className="btn btn-sm join-item btn-ghost"
                                        onClick={() => setIsScreenshotModalOpen(true)}
                                        title="Take Screenshot"
                                        disabled={!selectedDevice}
                                    >
                                        <Camera size={16} />
                                    </button>
                                </div>
                            )}

                            <button
                                className="btn btn-sm btn-ghost gap-2 text-primary"
                                onClick={() => setIsApiRefModalOpen(true)}
                                title="API Reference"
                            >
                                <HelpCircle size={16} /> API Ref
                            </button>
                            <div className="flex-1"></div> {/* Spacer to push Delete to right */}

                            <button
                                className="btn btn-sm btn-ghost gap-2 text-error"
                                onClick={handleDeleteScript}
                                title="Delete Script"
                            >
                                <Trash2 size={16} />
                            </button>

                        </>
                    ) : (
                        <div className="text-base-content/50 italic">Select a script to edit</div>
                    )}
                </div>

                {/* Monaco Container */}
                <div className="flex-1 relative">
                    {selectedScriptId ? (
                        isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : (
                            <Editor
                                height="100%"
                                defaultLanguage="python"
                                path={selectedScriptId} // Helps model separation
                                value={code}
                                theme="vs-dark" // Helper to match DaisyUI theme? vs-dark is safe
                                onChange={(value) => {
                                    setCode(value || "");
                                    setIsDirty(value !== originalCode);
                                }}
                                onMount={handleEditorMount}
                                options={{
                                    minimap: { enabled: true },
                                    fontSize: 14,
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full text-base-content/30 flex-col gap-4">
                            <FileCode size={48} />
                            <p>No file open</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Script Modal */}
            {
                isModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box">
                            <h3 className="font-bold text-lg">Create New Script</h3>
                            <div className="form-control w-full mt-4">
                                <label className="label">
                                    <span className="label-text">Script Name</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="my-awesome-script"
                                    className="input input-bordered w-full"
                                    value={newScriptName}
                                    onChange={e => setNewScriptName(e.target.value)}
                                />
                                <label className="label">
                                    <span className="label-text">Platform</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={newScriptPlatform}
                                    onChange={e => setNewScriptPlatform(e.target.value)}
                                >
                                    <option value="android">Android (ADB)</option>
                                    <option value="desktop">Desktop (Robot)</option>
                                </select>
                                <label className="label">
                                    <span className="label-text-alt">Only letters, numbers, hyphens, and underscores.</span>
                                </label>
                            </div>

                            <div className="modal-action">
                                <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateScript}
                                    disabled={isCreating || !newScriptName.trim()}
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Delete Script"
                message={`Are you sure you want to delete script '${selectedScriptId}'? This action cannot be undone.`}
                onConfirm={executeDeleteScript}
                onCancel={() => setIsDeleteModalOpen(false)}
                type="danger"
                confirmText="Delete"
            />

            {/* Android Screenshot Modal */}
            <ScreenshotModal
                isOpen={isScreenshotModalOpen}
                onClose={() => {
                    setIsScreenshotModalOpen(false);
                    setAssetRefreshTrigger(prev => prev + 1);
                }}
                deviceId={selectedDevice}
                scriptId={selectedScriptId}
            />

            <ApiRefModal
                isOpen={isApiRefModalOpen}
                onClose={() => setIsApiRefModalOpen(false)}
            />
        </div >
    );
};
