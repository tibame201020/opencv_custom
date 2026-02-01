import React, { useEffect, useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import axios from 'axios';
import { useAppStore } from '../store';
import { Save, Play, FileCode, Plus } from 'lucide-react';

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
    const [isCreating, setIsCreating] = useState(false);

    const editorRef = useRef<any>(null);

    useEffect(() => {
        fetchScripts();
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
        if (!selectedScriptId) return;
        try {
            await axios.post(`${API_Base}/scripts/${selectedScriptId}/content`, { content: code });
            setOriginalCode(code);
            setIsDirty(false);
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save script");
        }
    };

    const handleCreateScript = async () => {
        if (!newScriptName.trim()) return;
        setIsCreating(true);
        try {
            await axios.post(`${API_Base}/scripts`, {
                name: newScriptName,
                platform: 'android' // Default
            });
            await fetchScripts(); // Refresh list
            setIsModalOpen(false);
            setNewScriptName("");
        } catch (err: any) {
            console.error("Failed to create script", err);
            alert("Failed to create script: " + (err.response?.data?.error || err.message));
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
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
            <div className="w-64 border-r border-base-300 flex flex-col bg-base-200">
                <div className="p-4 font-bold text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileCode size={20} /> Script Explorer
                    </div>
                    <button
                        className="btn btn-xs btn-ghost btn-square"
                        onClick={() => setIsModalOpen(true)}
                        title="New Script"
                    >
                        <Plus size={16} />
                    </button>
                </div>
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
            </div>

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
            {isModalOpen && (
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
            )}
        </div>
    );
};
