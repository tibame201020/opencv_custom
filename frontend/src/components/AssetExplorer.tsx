import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileImage, Trash2, Edit2, X, Folder, FolderPlus, ChevronRight, ChevronDown, ListTree, ChevronLeft, FileCode, FileText, FileJson, File, FilePlus } from 'lucide-react';
import clsx from 'clsx';

const API_Base = 'http://localhost:8080/api';

interface AssetNode {
    name: string;
    path: string; // Relative path from project root
    isDir: boolean;
    children?: AssetNode[];
}

interface AssetExplorerProps {
    scriptId: string | null;
    width: number;
    collapsed: boolean;
    refreshKey?: number;
    onToggle: () => void;
    onResize: (width: number) => void;
    onFileOpen?: (path: string) => void;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({ scriptId, width, collapsed, refreshKey, onToggle, onResize, onFileOpen }) => {
    const [assets, setAssets] = useState<AssetNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
    const [previewAsset, setPreviewAsset] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""])); // Root is empty string

    // Resize Refs
    const isResizingWidth = useRef(false);
    const isResizingHeight = useRef(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const startWidth = useRef(0);
    const startHeight = useRef(200);
    const [snippetsHeight, setSnippetsHeight] = useState(200);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: AssetNode | null } | null>(null);

    // Modals
    const [renameTarget, setRenameTarget] = useState<AssetNode | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [mkdirTarget, setMkdirTarget] = useState<string | null>(null); // Parent path
    const [createFileTarget, setCreateFileTarget] = useState<string | null>(null); // Parent path
    const [deleteTarget, setDeleteTarget] = useState<AssetNode | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingWidth.current) {
                const deltaX = e.clientX - startX.current;
                onResize(Math.max(150, Math.min(600, startWidth.current + deltaX)));
            }
            if (isResizingHeight.current) {
                const deltaY = startY.current - e.clientY;
                setSnippetsHeight(Math.max(100, Math.min(600, startHeight.current + deltaY)));
            }
        };
        const handleMouseUp = () => {
            isResizingWidth.current = false;
            isResizingHeight.current = false;
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [onResize]);

    const startResizeWidth = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingWidth.current = true;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = 'col-resize';
    };

    const startResizeHeight = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingHeight.current = true;
        startY.current = e.clientY;
        startHeight.current = snippetsHeight;
        document.body.style.cursor = 'row-resize';
    };

    useEffect(() => {
        if (scriptId) fetchAssets();
        else setAssets([]);
    }, [scriptId, refreshKey]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const fetchAssets = async () => {
        if (!scriptId) return;
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_Base}/scripts/${scriptId}/assets`);
            setAssets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFolder = async (folderName: string) => {
        if (!scriptId || !folderName.trim()) {
            setMkdirTarget(null);
            return;
        }
        const trimmedName = folderName.trim();
        const fullPath = mkdirTarget ? `${mkdirTarget}/${trimmedName}` : trimmedName;
        try {
            await axios.post(`${API_Base}/scripts/${scriptId}/assets/mkdir`, { path: fullPath });
            setMkdirTarget(null);
            fetchAssets();
            setToast({ message: "Folder created", type: 'success' });
            setExpandedFolders(prev => new Set([...prev, mkdirTarget || ""]));
        } catch (err) { setToast({ message: "Create folder failed", type: 'error' }); }
    };

    const handleCreateFile = async (fileName: string) => {
        if (!scriptId || !fileName.trim()) {
            setCreateFileTarget(null);
            return;
        }
        const trimmedName = fileName.trim();
        const fullPath = createFileTarget ? `${createFileTarget}/${trimmedName}` : trimmedName;
        try {
            await axios.post(`${API_Base}/scripts/${scriptId}/assets/create`, { path: fullPath });
            setCreateFileTarget(null);
            fetchAssets();
            setToast({ message: "File created", type: 'success' });
            setExpandedFolders(prev => new Set([...prev, createFileTarget || ""]));
            if (onFileOpen && !isImageFile(trimmedName)) {
                onFileOpen(fullPath);
            }
        } catch (err) { setToast({ message: "Create file failed", type: 'error' }); }
    };

    const handleRename = async () => {
        if (!scriptId || !renameTarget || !renameValue.trim()) return;
        const parts = renameTarget.path.split('/');
        parts[parts.length - 1] = renameValue.trim();
        const newPath = parts.join('/');
        try {
            await axios.post(`${API_Base}/scripts/${scriptId}/assets/move`, { oldPath: renameTarget.path, newPath });
            setRenameTarget(null);
            fetchAssets();
            setToast({ message: "Renamed successfully", type: 'success' });
        } catch (err) { setToast({ message: "Rename failed", type: 'error' }); }
    };

    const handleDelete = async () => {
        if (!scriptId || !deleteTarget) return;
        try {
            // Encode path parts individually to avoid double encoding of slashes
            const safePath = deleteTarget.path.split('/').map(encodeURIComponent).join('/');
            await axios.delete(`${API_Base}/scripts/${scriptId}/assets/${safePath}`);
            setDeleteTarget(null);
            if (selectedAsset?.path === deleteTarget.path) setSelectedAsset(null);
            fetchAssets();
            setToast({ message: "Deleted successfully", type: 'success' });
        } catch (err) { setToast({ message: "Delete failed", type: 'error' }); }
    };

    const handleMove = async (oldPath: string, newPath: string) => {
        if (!scriptId || oldPath === newPath) return;
        try {
            await axios.post(`${API_Base}/scripts/${scriptId}/assets/move`, { oldPath, newPath });
            fetchAssets();
            setToast({ message: "Moved successfully", type: 'success' });
        } catch (err) { setToast({ message: "Move failed", type: 'error' }); }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const getFileIcon = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'py': return <FileCode size={14} className="text-secondary/60" />;
            case 'json': return <FileJson size={14} className="text-accent/60" />;
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'webp':
                return <FileImage size={14} className="text-info/60" />;
            case 'txt':
            case 'md':
                return <FileText size={14} className="text-base-content/40" />;
            default: return <File size={14} className="text-base-content/30" />;
        }
    };

    const isImageFile = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');
    };

    const renderNode = (node: AssetNode, level: number = 0) => {
        const isExpanded = expandedFolders.has(node.path);
        const isSelected = selectedAsset?.path === node.path;

        return (
            <div key={node.path}>
                <div
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("assetPath", node.path)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const source = e.dataTransfer.getData("assetPath");
                        if (!source || source === node.path) return;
                        const filename = source.split('/').pop();
                        const dest = node.isDir ? `${node.path}/${filename}` : `${node.path.split('/').slice(0, -1).join('/')}/${filename}`;
                        handleMove(source, dest);
                    }}
                    className={clsx(
                        "flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm group hover:bg-base-200 transition-colors rounded-sm",
                        isSelected && "bg-primary/20 text-primary font-bold"
                    )}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                    onClick={() => {
                        if (node.isDir) toggleFolder(node.path);
                        setSelectedAsset(node);
                    }}
                    onDoubleClick={() => {
                        if (!node.isDir) {
                            if (isImageFile(node.name)) {
                                setPreviewAsset(node.path);
                            } else if (onFileOpen) {
                                onFileOpen(node.path);
                            }
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, node });
                    }}
                >
                    {node.isDir ? (
                        <>
                            {isExpanded ? <ChevronDown size={12} className="opacity-40" /> : <ChevronRight size={12} className="opacity-40" />}
                            <Folder size={14} className="text-warning/80" />
                        </>
                    ) : (
                        getFileIcon(node.name)
                    )}
                    <span className="truncate flex-1">{node.name}</span>
                </div>
                {node.isDir && isExpanded && node.children?.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    if (collapsed) {
        return (
            <div className="w-10 border-r border-base-300 bg-base-200 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-base-300/50 transition-colors" onClick={onToggle}>
                <div className="tooltip tooltip-right" data-tip="Assets"><ListTree size={20} className="opacity-50" /></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-base-100 border-r border-base-300 text-base-content/80 select-none relative" style={{ width }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-9 bg-base-200 text-[10px] font-bold uppercase tracking-wider shrink-0 border-b border-base-300">
                <span className="opacity-70 flex items-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={onToggle}><ChevronLeft size={14} /> Explorer</span>
                <div className="flex items-center gap-1">
                    <button className="btn btn-ghost btn-xs btn-square" onClick={() => setCreateFileTarget("")} title="New File"><FilePlus size={14} /></button>
                    <button className="btn btn-ghost btn-xs btn-square" onClick={() => setMkdirTarget("")} title="New Folder"><FolderPlus size={14} /></button>
                </div>
            </div>

            {/* Tree View */}
            <div
                className="flex-1 overflow-y-auto p-1 py-2 custom-scrollbar"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    const source = e.dataTransfer.getData("assetPath");
                    if (source) handleMove(source, source.split('/').pop() || "");
                }}
                onContextMenu={(e) => {
                    if (e.target === e.currentTarget) {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, node: null });
                    }
                }}
            >
                {isLoading ? <div className="p-4 text-center opacity-40 text-xs">Loading...</div> : assets.map(n => renderNode(n))}
            </div>

            {/* Snippets (Only for Images) */}
            {selectedAsset && !selectedAsset.isDir && isImageFile(selectedAsset.name) && (
                <div className="border-t border-base-300 bg-base-100 relative shadow-2xl" style={{ height: snippetsHeight }}>
                    <div className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-primary/50 transition-colors" onMouseDown={startResizeHeight} />
                    <div className="px-3 py-1.5 bg-base-200 text-[9px] font-bold uppercase opacity-60 flex items-center gap-1 truncate border-b border-base-300">
                        <FileImage size={10} /> {selectedAsset.name}
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto h-full pb-8">
                        {[
                            { label: 'ClickImage', code: `self.platform.click_image(f"{self.image_root}/${selectedAsset.path.replace(/^images\//, '')}", OcrRegion(0, 0, 100, 100), self.deviceId)` },
                            { label: 'FindImage', code: `found, pt = self.platform.find_image_full(f"{self.image_root}/${selectedAsset.path.replace(/^images\//, '')}", self.deviceId)` }, // Fixed path
                            { label: 'Path', code: `f"{self.image_root}/${selectedAsset.path.replace(/^images\//, '')}"` }
                        ].map((snip, i) => (
                            <div key={i}>
                                <div className="text-[9px] opacity-40 mb-0.5">{snip.label}</div>
                                <div className="bg-base-200 p-2 rounded text-[10px] font-mono break-all cursor-pointer hover:bg-base-300 border border-base-300" onClick={() => navigator.clipboard.writeText(snip.code)}>
                                    {snip.code}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 z-20" onMouseDown={startResizeWidth} />

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed z-[200] bg-base-200 border border-base-300 shadow-xl rounded py-1 min-w-[140px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <button className="w-full px-3 py-1.5 text-left text-xs hover:bg-primary/10 flex items-center gap-2" onClick={() => setCreateFileTarget(contextMenu.node?.isDir ? contextMenu.node.path : contextMenu.node?.path.split('/').slice(0, -1).join('/') || "")}>
                        <FilePlus size={13} /> New File
                    </button>
                    <button className="w-full px-3 py-1.5 text-left text-xs hover:bg-primary/10 flex items-center gap-2" onClick={() => setMkdirTarget(contextMenu.node?.isDir ? contextMenu.node.path : contextMenu.node?.path.split('/').slice(0, -1).join('/') || "")}>
                        <FolderPlus size={13} /> New Folder
                    </button>
                    {contextMenu.node && (
                        <>
                            <div className="h-px bg-base-300 my-1" />
                            <button className="w-full px-3 py-1.5 text-left text-xs hover:bg-primary/10 flex items-center gap-2" onClick={() => { setRenameTarget(contextMenu.node!); setRenameValue(contextMenu.node!.name); }}>
                                <Edit2 size={13} /> Rename
                            </button>
                            <div className="h-px bg-base-300 my-1" />
                            <button className="w-full px-3 py-1.5 text-left text-xs text-error hover:bg-error/10 flex items-center gap-2" onClick={() => setDeleteTarget(contextMenu.node!)}>
                                <Trash2 size={13} /> Delete
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Modals placeholders */}
            {createFileTarget !== null && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-base-100 p-4 rounded-lg shadow-xl w-64 border border-base-300">
                        <h3 className="text-sm font-bold mb-3">New File</h3>
                        <input autoFocus className="input input-sm input-bordered w-full mb-4" placeholder="filename.py" onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateFile((e.target as HTMLInputElement).value);
                            if (e.key === 'Escape') setCreateFileTarget(null);
                        }} />
                        <div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={() => setCreateFileTarget(null)}>Cancel</button></div>
                    </div>
                </div>
            )}
            {mkdirTarget !== null && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-base-100 p-4 rounded-lg shadow-xl w-64 border border-base-300">
                        <h3 className="text-sm font-bold mb-3">New Folder</h3>
                        <input autoFocus className="input input-sm input-bordered w-full mb-4" placeholder="folder name" onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateFolder((e.target as HTMLInputElement).value);
                            if (e.key === 'Escape') setMkdirTarget(null);
                        }} />
                        <div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={() => setMkdirTarget(null)}>Cancel</button></div>
                    </div>
                </div>
            )}

            {renameTarget && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-base-100 p-4 rounded-lg shadow-xl w-64 border border-base-300">
                        <h3 className="text-sm font-bold mb-3">Rename</h3>
                        <input autoFocus className="input input-sm input-bordered w-full mb-4" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') setRenameTarget(null);
                        }} />
                        <div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={() => setRenameTarget(null)}>Cancel</button><button className="btn btn-xs btn-primary" onClick={handleRename}>OK</button></div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-base-100 p-4 rounded-lg shadow-xl w-64 border border-base-300">
                        <h3 className="text-sm font-bold text-error mb-2">Delete?</h3>
                        <p className="text-[10px] opacity-60 mb-4 truncate">{deleteTarget.path}</p>
                        <div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn btn-xs btn-error" onClick={handleDelete}>Delete</button></div>
                    </div>
                </div>
            )}

            {previewAsset && isImageFile(previewAsset) && (
                <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md" onClick={() => setPreviewAsset(null)}>
                    <div className="max-w-[90vw] max-h-[90vh] relative p-1 bg-base-100 rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-2 mb-2 border-b border-base-200">
                            <span className="text-xs font-bold opacity-60">{previewAsset}</span>
                            <button onClick={() => setPreviewAsset(null)} className="btn btn-xs btn-circle btn-ghost"><X size={14} /></button>
                        </div>
                        <img className="max-h-[75vh] object-contain rounded" src={`${API_Base}/scripts/${scriptId}/raw-assets/${previewAsset}`} alt="preview" />
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="toast toast-end toast-bottom z-[300] mb-4 mr-4">
                    <div className={clsx("alert shadow-lg py-2 px-4 transition-all duration-300",
                        toast.type === 'success' ? "alert-success" : "alert-error")}>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase">{toast.message}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
