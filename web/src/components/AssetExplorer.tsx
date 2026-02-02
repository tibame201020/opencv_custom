import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileImage, Trash2, Edit2, X } from 'lucide-react';
import clsx from 'clsx';
// import { useAppStore } from '../store'; // Not used if we don't access scriptDef

const API_Base = 'http://localhost:8080/api';

interface Asset {
    name: string;
    path: string;
    size?: number;
}

interface AssetExplorerProps {
    scriptId: string | null;
    width: number;
    collapsed: boolean;
    refreshKey?: number;
    onToggle: () => void;
    onResize: (width: number) => void;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({ scriptId, width, collapsed, refreshKey, onToggle, onResize }) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [previewAsset, setPreviewAsset] = useState<string | null>(null);

    // Snippets Height State
    const [snippetsHeight, setSnippetsHeight] = useState(200);

    // Resize Refs
    const isResizingWidth = useRef(false);
    const isResizingHeight = useRef(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const startWidth = useRef(0);
    const startHeight = useRef(0);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, asset: string } | null>(null);

    // Modals
    const [renameTarget, setRenameTarget] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // Global Mouse Handlers for Resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingWidth.current) {
                const deltaX = e.clientX - startX.current;
                const newWidth = Math.max(150, Math.min(600, startWidth.current + deltaX));
                onResize(newWidth);
            }
            if (isResizingHeight.current) {
                const deltaY = startY.current - e.clientY; // Up is positive for height increase (since it's bottom panel)
                const newHeight = Math.max(100, Math.min(600, startHeight.current + deltaY));
                setSnippetsHeight(newHeight);
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

    // Close context menu on click elsewhere
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
            console.error("Failed to fetch assets", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRename = async () => {
        if (!scriptId || !renameTarget || !renameValue.trim()) return;
        try {
            await axios.post(`${API_Base}/scripts/${scriptId}/assets/rename`, {
                oldName: renameTarget,
                newName: renameValue.trim()
            });
            setRenameTarget(null);
            fetchAssets();
        } catch (err) {
            console.error(err);
            alert("Rename failed");
        }
    };

    const handleDelete = async () => {
        if (!scriptId || !deleteTarget) return;
        try {
            await axios.delete(`${API_Base}/scripts/${scriptId}/assets/${deleteTarget}`);
            setDeleteTarget(null);
            fetchAssets();
            if (selectedAsset === deleteTarget) setSelectedAsset(null);
        } catch (err) {
            console.error(err);
            alert("Delete failed");
        }
    };

    const handleContextMenu = (e: React.MouseEvent, assetName: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, asset: assetName });
    };

    // Snippets Generation
    const getSnippets = (filename: string) => {
        // Standardized snippet generation using self.image_root

        return [
            { label: 'Click Image', code: `self.platform.click_image(f"{self.image_root}/${filename}", OcrRegion(0, 0, 100, 100), self.deviceId)` },
            { label: 'Find Image', code: `found, point = self.platform.find_image_full(f"{self.image_root}/${filename}", self.deviceId)` },
            { label: 'Asset Path', code: `f"{self.image_root}/${filename}"` },
        ];
    };

    const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);
    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(index);
        setTimeout(() => setCopiedSnippet(null), 1500);
    };

    if (collapsed) {
        return (
            <div
                className="w-10 border-r border-base-300 bg-base-200 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-base-300/50 transition-colors"
                onClick={onToggle}
                title="Expand Asset Explorer"
            >
                <div className="tooltip tooltip-right" data-tip="Assets">
                    <FileImage size={20} className="opacity-50" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#333] text-gray-300 select-none relative" style={{ width }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-9 bg-[#252526] text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer" onClick={onToggle}>
                <span className="opacity-70">Images</span>
                <div className="flex items-center gap-1">
                    <span className="badge badge-xs badge-ghost font-mono opacity-50">{assets.length}</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                {isLoading && <div className="text-center p-4 opacity-50 text-xs">Loading...</div>}

                {!isLoading && assets.map(asset => (
                    <div
                        key={asset.name}
                        className={clsx(
                            "flex items-center gap-2 px-2 py-1 rounded-sm cursor-pointer text-sm group",
                            selectedAsset === asset.name ? "bg-[#37373d] text-white" : "hover:bg-[#2a2d2e]"
                        )}
                        onClick={() => setSelectedAsset(asset.name)}
                        onDoubleClick={() => setPreviewAsset(asset.name)}
                        onContextMenu={(e) => handleContextMenu(e, asset.name)}
                    >
                        <FileImage size={14} className={clsx("shrink-0", selectedAsset === asset.name ? "text-blue-400" : "opacity-50 group-hover:opacity-80")} />
                        <span className="truncate flex-1">{asset.name}</span>
                    </div>
                ))}

                {!isLoading && assets.length === 0 && (
                    <div className="text-center p-8 opacity-30 text-xs italic">
                        No images found.<br />Screenshots saved will appear here.
                    </div>
                )}
            </div>

            {/* Snippets Panel (Bottom) */}
            {selectedAsset && (
                <div
                    className="min-h-[100px] border-t border-[#333] bg-[#1e1e1e] flex flex-col relative"
                    style={{ height: snippetsHeight }}
                >
                    {/* Height Resize Handle */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500/50 z-10"
                        onMouseDown={startResizeHeight}
                    />

                    <div className="px-3 py-2 bg-[#252526] text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-2 shrink-0">
                        <span>Snippets</span>
                        <span className="opacity-30">/</span>
                        <span className="truncate text-blue-400 max-w-[120px]">{selectedAsset}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {getSnippets(selectedAsset).map((snip, idx) => (
                            <div key={idx} className="group relative">
                                <div className="text-[10px] opacity-40 mb-1 pl-1">{snip.label}</div>
                                <div
                                    className="bg-[#2d2d2d] hover:bg-[#333] p-2 rounded text-[11px] font-mono break-all cursor-pointer transition-colors border border-transparent hover:border-[#444]"
                                    onClick={() => copyToClipboard(snip.code, idx)}
                                >
                                    {snip.code}
                                </div>
                                {copiedSnippet === idx && (
                                    <div className="absolute right-2 top-6 text-[10px] text-green-400 font-bold bg-[#1e1e1e] px-1 rounded shadow-sm animate-in fade-in zoom-in">
                                        Copied
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Width Resize Handle */}
            <div
                className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 z-20"
                onMouseDown={startResizeWidth}
            />

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-[#252526] border border-[#454545] shadow-xl rounded py-1 min-w-[150px] flex flex-col"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        className="px-3 py-1.5 text-left text-sm hover:bg-[#094771] hover:text-white flex items-center gap-2"
                        onClick={() => {
                            setRenameTarget(contextMenu.asset);
                            setRenameValue(contextMenu.asset);
                            setContextMenu(null);
                        }}
                    >
                        <Edit2 size={13} /> Rename
                    </button>
                    <div className="h-px bg-[#454545] my-1" />
                    <button
                        className="px-3 py-1.5 text-left text-sm hover:bg-[#a10000] hover:text-white text-red-400 flex items-center gap-2"
                        onClick={() => {
                            setDeleteTarget(contextMenu.asset);
                            setContextMenu(null);
                        }}
                    >
                        <Trash2 size={13} /> Delete
                    </button>
                </div>
            )}

            {/* Rename Modal */}
            {renameTarget && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#252526] border border-[#454545] p-4 rounded shadow-2xl w-80 text-gray-200">
                        <h3 className="font-bold text-sm mb-4">Rename Asset</h3>
                        <input
                            autoFocus
                            className="w-full bg-[#3c3c3c] border border-[#333] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 mb-4"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename();
                                if (e.key === 'Escape') setRenameTarget(null);
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button className="btn btn-xs btn-ghost" onClick={() => setRenameTarget(null)}>Cancel</button>
                            <button className="btn btn-xs btn-primary" onClick={handleRename}>Rename</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#252526] border border-[#454545] p-4 rounded shadow-2xl w-80 text-gray-200">
                        <h3 className="font-bold text-sm text-red-400 mb-2">Delete Asset?</h3>
                        <p className="text-xs opacity-70 mb-6">
                            Are you sure you want to delete <span className="font-bold text-white">{deleteTarget}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button className="btn btn-xs btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="btn btn-xs btn-error" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewAsset && scriptId && (
                <div
                    className="fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-md p-8"
                    onClick={() => setPreviewAsset(null)}
                >
                    <div className="relative max-w-full max-h-full p-2 bg-[#252526] rounded shadow-2xl border border-[#454545]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-sm font-bold text-gray-300">{previewAsset}</h3>
                            <button onClick={() => setPreviewAsset(null)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
                        </div>
                        <div className="bg-[url('/transparent-bg.png')] bg-repeat rounded overflow-hidden">
                            {/* Use direct script asset path via API or if we have a static route. 
                                Actually we don't have a static route for script images yet?
                                Wait, backend /api/scripts/:id/content returns Text.
                                We might need an image serving route.
                                Ah, we can use Base64 if needed, or better, add a static route in backend.
                                The backend currently has NO static file serving for script images.
                                I should check main.go again.
                                I might need to add a route: GET /api/scripts/:id/assets/:filename/raw
                             */}
                            <img
                                src={`${API_Base}/scripts/${scriptId}/assets/${previewAsset}/raw`}
                                alt={previewAsset}
                                className="max-w-[80vw] max-h-[80vh] object-contain block"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    alert("Preview not available (Static route missing?)");
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
