import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';
import clsx from 'clsx';
import { showToast } from '../utils/toast';

interface AssetManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    onSelect?: (path: string) => void; // Optional selection mode
}

interface AssetFile {
    name: string;
    path: string; // relative path
    isDir: boolean;
    children?: AssetFile[];
}

export const AssetManagerModal: React.FC<AssetManagerModalProps> = ({
    isOpen, onClose, projectId, projectName, onSelect
}) => {
    const { apiBaseUrl } = useAppStore();
    const [assets, setAssets] = useState<AssetFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // The current backend walk returns a tree. For the grid, we might want to flatten it or show folders.
    // For simplicity, let's show a flattened list of IMAGES only for now, or traverse the "images" folder.

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets`);
            if (!res.ok) throw new Error("Failed to load assets");
            const data = await res.json();
            setAssets(data || []);
        } catch (err) {
            console.error(err);
            showToast("Failed to load project assets", "error");
        } finally {
            setIsLoading(false);
        }
    }, [apiBaseUrl, projectId]);

    useEffect(() => {
        if (isOpen) {
            fetchAssets();
        }
    }, [isOpen, fetchAssets]);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            // Defaulting to "images" folder at root of project assets
            // Backend handles this default if relPath is empty

            try {
                const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) successCount++;
            } catch (error) {
                console.error("Upload failed", file.name, error);
            }
        }

        if (successCount > 0) {
            showToast(`Uploaded ${successCount}/${total} files`, "success");
            fetchAssets();
        } else {
            showToast("Upload failed", "error");
        }
    };



    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleUpload(e.dataTransfer.files);
    };

    // Helper to flatten the tree into a list of images for the Grid View
    // We strictly look into "images" folder if it exists, or just all images.
    const getAllImages = (nodes: AssetFile[]): AssetFile[] => {
        let images: AssetFile[] = [];
        for (const node of nodes) {
            if (node.isDir) {
                if (node.children) images = [...images, ...getAllImages(node.children)];
            } else {
                const ext = node.name.split('.').pop()?.toLowerCase();
                if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
                    images.push(node);
                }
            }
        }
        return images;
    };

    // Construct preview URL
    const getPreviewUrl = (path: string) => {
        // Use the new project asset endpoint
        // path might be "images/foo.png"
        return `${apiBaseUrl}/projects/${projectId}/raw-assets/${path}`;
    };

    const flatImages = getAllImages(assets);

    // Confirmation Modal State
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; path: string | null }>({ isOpen: false, path: null });

    const handleDeleteClick = (path: string) => {
        setConfirmDelete({ isOpen: true, path });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.path) return;
        const path = confirmDelete.path;
        setConfirmDelete({ isOpen: false, path: null });

        try {
            // Encode path for URL
            const safePath = path.split('/').map(encodeURIComponent).join('/');
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets/${safePath}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast("Asset deleted", "success");
                fetchAssets();
            } else {
                showToast("Failed to delete", "error");
            }
        } catch (err) {
            showToast("Delete error", "error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className={clsx(
                    "bg-base-100 w-[800px] h-[600px] rounded-xl shadow-2xl flex flex-col border border-base-300 transition-all",
                    isDragging && "ring-4 ring-primary ring-inset scale-[1.01]"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200/50">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <ImageIcon className="text-primary" />
                            Project Assets
                        </h3>
                        <p className="text-xs opacity-50 font-mono">{projectName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="btn btn-primary btn-sm gap-2">
                            <Upload size={16} />
                            Upload Images
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUpload(e.target.files)}
                            />
                        </label>
                        <button className="btn btn-ghost btn-sm btn-square" onClick={fetchAssets}>
                            <RefreshCw size={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-base-200/30">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : flatImages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-base-300 rounded-lg">
                            <Upload size={48} className="mb-4" />
                            <p className="font-bold">No assets found</p>
                            <p className="text-sm">Drag and drop images here to upload</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {flatImages.map(img => (
                                <div
                                    key={img.path}
                                    className="group relative bg-base-100 rounded-lg shadow-sm border border-base-200 hover:shadow-md transition-all overflow-hidden aspect-square flex flex-col cursor-pointer"
                                    onClick={() => onSelect?.(img.path)}
                                >
                                    {/* Image Preview */}
                                    <div className="flex-1 relative bg-neutral/5 pattern-checkerboard pattern-opacity-50">
                                        <img
                                            src={getPreviewUrl(img.path)}
                                            alt={img.name}
                                            className="absolute inset-0 w-full h-full object-contain p-2"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtaW1hZ2Utb2ZmIj48bGluZSB4MT0iMiIgeTE9IjIiIHgyPSIyMiIgeTI9IjIyIiAvPjxwYXRoIGQ9Ik0xMC40MSAxMC40MWEyIDIgMCAxIDEgMiAyIiAvPjxwYXRoIGQ9Ik0xMy41IDEzLjVMMTYgMTkiIC8+PHBhdGggZD0iTTIxIDE1bC0zLjA4LTMuMDhjLS4xLS4xLS4yNS0uMTUtLjMzLS4wOGwtMS41NyAxLjU3IiAvPjxwYXRoIGQ9Ik0xNy41IDE0TDkgMTkiIC8+PHBhdGggZD0iTTEyIDVIMTVhMiAyIDAgMCAxIDIgMnYyIiAvPjxwYXRoIGQ9Ik0xNCA4aC0yLjQzIiAvPjxwYXRoIGQ9Ik00IDEyYTIgMiAwIDAgMSA4LTEuMjgiIC8+PHBhdGggZD0iTTUgMTVsNC00IiAvPjwvc3ZnPg=='; // Fallback
                                            }}
                                        />
                                    </div>

                                    {/* Footer */}
                                    <div className="p-2 border-t border-base-200 bg-base-100 text-[10px] font-mono truncate relative">
                                        {img.name}
                                    </div>

                                    {/* Overlay Actions */}
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button
                                            className="btn btn-xs btn-error btn-square shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(img.path);
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    {/* Select indicator if in selection mode */}
                                    {onSelect && (
                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 pointer-events-none" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Drag Hint */}
                {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center rounded-xl border-2 border-primary border-dashed z-50">
                        <div className="text-2xl font-bold text-primary animate-bounce">Drop to Upload</div>
                    </div>
                )}

                {/* DaisyUI Modal for Confirmation */}
                {confirmDelete.isOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box">
                            <h3 className="font-bold text-lg text-error">Delete Asset</h3>
                            <p className="py-4">Are you sure you want to delete <span className="font-mono font-bold">{confirmDelete.path}</span>?</p>
                            <div className="modal-action">
                                <button className="btn" onClick={() => setConfirmDelete({ isOpen: false, path: null })}>Cancel</button>
                                <button className="btn btn-error" onClick={handleConfirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
