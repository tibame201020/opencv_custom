import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, RefreshCw, CheckSquare, Maximize2, Edit2, Copy, Folder, FolderPlus, ChevronRight } from 'lucide-react';
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

/**
 * Component that loads an image via fetch() and displays it as a blob URL.
 */
const AssetImage: React.FC<{ url: string; alt: string; className?: string }> = ({ url, alt, className }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const revokeRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (revokeRef.current) {
            URL.revokeObjectURL(revokeRef.current);
            revokeRef.current = null;
        }

        setBlobUrl(null);
        setFailed(false);

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                if (cancelled) return;
                const objectUrl = URL.createObjectURL(blob);
                revokeRef.current = objectUrl;
                setBlobUrl(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
            if (revokeRef.current) {
                URL.revokeObjectURL(revokeRef.current);
                revokeRef.current = null;
            }
        };
    }, [url]);

    if (failed) {
        return (
            <div className={clsx("flex items-center justify-center text-base-content/20", className)}>
                <ImageIcon size={32} />
            </div>
        );
    }

    if (!blobUrl) {
        return (
            <div className={clsx("flex items-center justify-center", className)}>
                <span className="loading loading-spinner loading-sm text-base-content/30"></span>
            </div>
        );
    }

    return <img src={blobUrl} alt={alt} className={className} loading="lazy" draggable={false} />;
};

export const AssetManagerModal: React.FC<AssetManagerModalProps> = ({
    isOpen, onClose, projectId, projectName, onSelect
}) => {
    const { apiBaseUrl } = useAppStore();
    const [assets, setAssets] = useState<AssetFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // New Feature States
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'add' | 'remove'>('add');
    const [previewAsset, setPreviewAsset] = useState<AssetFile | null>(null);
    const [renamingAsset, setRenamingAsset] = useState<{ path: string; oldName: string } | null>(null);
    const [newName, setNewName] = useState("");

    // Upload Conflict States
    const [uploadConflicts, setUploadConflicts] = useState<File[]>([]);
    const [pendingNonConflicts, setPendingNonConflicts] = useState<File[]>([]);

    // Folder & Navigation States
    const [currentPath, setCurrentPath] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Lasso / Drag-to-Select State
    const gridRef = useRef<HTMLDivElement>(null);
    const [lassoStart, setLassoStart] = useState<{ x: number, y: number } | null>(null);
    const [lassoCurrent, setLassoCurrent] = useState<{ x: number, y: number } | null>(null);

    // Confirmation Modal State
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; paths: string[] }>({ isOpen: false, paths: [] });

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets`);
            if (!res.ok) throw new Error("Failed to load assets");
            const data = await res.json();
            setAssets(data || []);
            setSelectedPaths(new Set()); // Reset selection on reload
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
        } else {
            setSelectedPaths(new Set());
            setPreviewAsset(null);
            setConfirmDelete({ isOpen: false, paths: [] });
            setRenamingAsset(null);
            setNewName("");
            setUploadConflicts([]);
            setPendingNonConflicts([]);
            setCurrentPath('');
            setIsCreatingFolder(false);
            setNewFolderName('');
        }
    }, [isOpen, fetchAssets]);

    // Handle global mouse up to stop drag-to-select
    useEffect(() => {
        const handleMouseUp = () => setIsSelecting(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Handle Lasso / Drag-to-Select
    useEffect(() => {
        if (!lassoStart) return;

        const handleMouseMove = (e: MouseEvent) => {
            setLassoCurrent({ x: e.clientX, y: e.clientY });

            if (lassoStart && gridRef.current) {
                const currentX = e.clientX;
                const currentY = e.clientY;

                const lRect = {
                    left: Math.min(lassoStart.x, currentX),
                    right: Math.max(lassoStart.x, currentX),
                    top: Math.min(lassoStart.y, currentY),
                    bottom: Math.max(lassoStart.y, currentY),
                };

                const elements = gridRef.current.querySelectorAll('[data-path]');
                const newSelection = new Set<string>();

                elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const overlap = !(
                        rect.right < lRect.left ||
                        rect.left > lRect.right ||
                        rect.bottom < lRect.top ||
                        rect.top > lRect.bottom
                    );

                    if (overlap) {
                        const path = el.getAttribute('data-path');
                        if (path) newSelection.add(path);
                    }
                });

                setSelectedPaths(newSelection);
            }
        };

        const handleMouseUp = () => {
            setLassoStart(null);
            setLassoCurrent(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [lassoStart]);

    // Handle delete shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || previewAsset || confirmDelete.isOpen) return; // Don't delete if overlay is open
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0) {
                // Ignore if typing in an input
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

                e.preventDefault();
                setConfirmDelete({ isOpen: true, paths: Array.from(selectedPaths) });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedPaths, previewAsset, confirmDelete.isOpen]);

    const getCurrentNodes = (nodes: AssetFile[], pathStr: string): AssetFile[] => {
        if (!pathStr) return nodes;
        const parts = pathStr.split('/');
        let current = nodes;
        for (const p of parts) {
            const found = current.find(n => n.name === p && n.isDir);
            if (found && found.children) {
                current = found.children;
            } else {
                return [];
            }
        }
        return current;
    };

    const currentNodes = getCurrentNodes(assets, currentPath);

    // Filter to only show directories and valid images, and sort
    const displayNodes = [...currentNodes].filter(n => {
        if (n.isDir) return true;
        const ext = n.name.split('.').pop()?.toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');
    }).sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
    });

    const processUpload = async (filesToUpload: File[]) => {
        if (filesToUpload.length === 0) return;
        setIsLoading(true);
        let successCount = 0;
        const total = filesToUpload.length;

        const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64Data = result.split(',')[1] || '';
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });

        for (let i = 0; i < total; i++) {
            const file = filesToUpload[i];
            try {
                const base64Data = await toBase64(file);
                const payload = {
                    filename: file.name,
                    data: base64Data,
                    relPath: currentPath
                };

                const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
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
            setIsLoading(false);
        }
    };

    const handleUpload = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const incomingFiles = Array.from(files);
        const conflicts: File[] = [];
        const nonConflicts: File[] = [];

        // Find if file name already exists in currentNodes
        for (const file of incomingFiles) {
            // Check only the basename
            const isConflict = currentNodes.some(node => node.name === file.name && !node.isDir);
            if (isConflict) {
                conflicts.push(file);
            } else {
                nonConflicts.push(file);
            }
        }

        if (conflicts.length > 0) {
            setUploadConflicts(conflicts);
            setPendingNonConflicts(nonConflicts);
        } else {
            processUpload(nonConflicts);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault(); // Sometimes needed to prevent default browser behavior
        // Check if we are really leaving the modal area, not just hovering over child elements
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleUpload(e.dataTransfer.files);
    };

    const getPreviewUrl = (path: string) => {
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        return `${apiBaseUrl}/projects/${projectId}/raw-assets/${encodedPath}`;
    };

    const handleCreateFolder = async () => {
        const trimmedName = newFolderName.trim();
        if (!trimmedName) return;
        setIsLoading(true);
        try {
            const targetPath = currentPath ? `${currentPath}/${trimmedName}` : trimmedName;
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets-mkdir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: targetPath })
            });
            if (res.ok) {
                showToast("Folder created", "success");
                setIsCreatingFolder(false);
                setNewFolderName("");
                fetchAssets();
            } else {
                showToast("Failed to create folder", "error");
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to create folder", "error");
            setIsLoading(false);
        }
    };

    const handleMoveAsset = async (sourcePath: string, targetPath: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets-move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourcePath, targetPath })
            });
            if (res.ok) {
                showToast("Asset moved", "success");
                fetchAssets();
            } else {
                showToast("Failed to move asset", "error");
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to move asset", "error");
            setIsLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (confirmDelete.paths.length === 0) return;
        const paths = confirmDelete.paths;
        setConfirmDelete({ isOpen: false, paths: [] });
        setIsLoading(true);

        let success = 0;
        for (const path of paths) {
            try {
                const safePath = path.split('/').map(encodeURIComponent).join('/');
                const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets/${safePath}`, {
                    method: 'DELETE'
                });
                if (res.ok) success++;
            } catch (err) {
                console.error("Delete error", err);
            }
        }

        if (success > 0) {
            showToast(`Deleted ${success} asset(s)`, "success");
            fetchAssets(); // reloads and clears selection
        } else {
            showToast("Failed to delete", "error");
            setIsLoading(false);
        }
    };

    const handleCopyAsset = async (path: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets-copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });
            if (res.ok) {
                showToast("Asset copied", "success");
                fetchAssets();
            } else {
                showToast("Failed to copy", "error");
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Copy error", err);
            showToast("Failed to copy", "error");
            setIsLoading(false);
        }
    };

    const handleRenameSubmit = async () => {
        if (!renamingAsset || !newName.trim()) return;
        const finalName = newName.trim();

        if (finalName === renamingAsset.oldName) {
            setRenamingAsset(null);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/projects/${projectId}/assets-rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: renamingAsset.path, newName: finalName })
            });

            if (res.ok) {
                showToast("Asset renamed", "success");
                setRenamingAsset(null);
                fetchAssets();
            } else {
                showToast("Failed to rename", "error");
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Rename error", err);
            showToast("Failed to rename", "error");
            setIsLoading(false);
        }
    };

    // Selection Handlers
    const toggleSelection = (path: string, forceState?: boolean) => {
        setSelectedPaths(prev => {
            const next = new Set(prev);
            if (forceState === true || (forceState === undefined && !next.has(path))) {
                next.add(path);
            } else {
                next.delete(path);
            }
            return next;
        });
    };

    const handleItemMouseDown = (e: React.MouseEvent, path: string) => {
        if (e.button !== 0) return; // Only left click
        e.preventDefault(); // Prevent text selection
        if (onSelect) {
            // Selection mode: check if this is a folder -> navigate into it
            const asset = assets.find(a => a.path === path);
            if (asset?.isDir) {
                setCurrentPath(path);
                return;
            }
            // It's a file -> single select
            onSelect(path);
            return;
        }

        const willSelect = !selectedPaths.has(path);
        setIsSelecting(true);
        setSelectionMode(willSelect ? 'add' : 'remove');
        toggleSelection(path, willSelect);
    };

    const handleItemMouseEnter = (path: string) => {
        if (!isSelecting || onSelect || lassoStart) return;
        toggleSelection(path, selectionMode === 'add');
    };

    // Action clicks that shouldn't trigger selection
    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    const handleGridMouseDown = (e: React.MouseEvent) => {
        if (onSelect) return; // Disable lasso in single-select mode
        if (e.target === gridRef.current || (e.target as HTMLElement).classList.contains('grid')) {
            e.preventDefault();
            setLassoStart({ x: e.clientX, y: e.clientY });
            setLassoCurrent({ x: e.clientX, y: e.clientY });
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                setSelectedPaths(new Set());
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className={clsx(
                    "bg-base-100 rounded-xl shadow-2xl flex flex-col border border-base-300 transition-all relative overflow-hidden",
                    "w-[95vw] max-w-[1200px] h-[85vh] max-h-[900px]",
                    isDragging && "ring-4 ring-primary ring-inset scale-[1.01]"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200/50 shrink-0 z-10">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <ImageIcon className="text-primary" />
                            Project Assets
                        </h3>
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1 text-xs opacity-70 font-mono mt-1">
                            <button
                                className="hover:text-primary hover:underline"
                                onClick={() => setCurrentPath('')}
                            >
                                {projectName}
                            </button>
                            {currentPath && currentPath.split('/').map((part, index, arr) => {
                                const pathToHere = arr.slice(0, index + 1).join('/');
                                return (
                                    <React.Fragment key={pathToHere}>
                                        <ChevronRight size={12} className="opacity-50" />
                                        <button
                                            className={clsx(
                                                "hover:text-primary hover:underline",
                                                index === arr.length - 1 && "font-bold text-primary"
                                            )}
                                            onClick={() => setCurrentPath(pathToHere)}
                                        >
                                            {part}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedPaths.size > 0 && !onSelect && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-200 flex items-center gap-2 mr-4 bg-error/10 text-error px-4 py-1.5 rounded-full border border-error/20">
                                <span className="text-sm font-bold">{selectedPaths.size} selected</span>
                                <div className="w-px h-4 bg-error/20 mx-1"></div>
                                <button
                                    className="btn btn-ghost btn-xs text-error hover:bg-error/20"
                                    onClick={() => setConfirmDelete({ isOpen: true, paths: Array.from(selectedPaths) })}
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                </button>
                                <button
                                    className="btn btn-ghost btn-xs hover:bg-error/20 ml-1"
                                    title="Clear Selection"
                                    onClick={() => setSelectedPaths(new Set())}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <button
                            className="btn btn-ghost btn-sm gap-2 mr-2"
                            onClick={() => setIsCreatingFolder(true)}
                        >
                            <FolderPlus size={16} />
                            New Folder
                        </button>

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
                        <button className="btn btn-ghost btn-sm btn-square" onClick={fetchAssets} title="Reload Assets">
                            <RefreshCw size={16} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-square hover:bg-error hover:text-white" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div
                    className="flex-1 overflow-y-auto p-6 bg-base-200/30 select-none pb-8"
                    onDragOver={handleDragOver} /* Catch drags over the content specifically */
                    onDrop={handleDrop}
                >
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : displayNodes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-base-300 rounded-xl pointer-events-none m-4">
                            <Upload size={48} className="mb-4 text-primary" />
                            <p className="text-xl font-bold mb-2">No assets found Here</p>
                            <p className="text-sm">Drag and drop images anywhere here to upload</p>
                        </div>
                    ) : (
                        <div
                            ref={gridRef}
                            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 min-h-[50vh]"
                            onMouseDown={handleGridMouseDown}
                        >
                            {displayNodes.map(img => {
                                const isSelected = selectedPaths.has(img.path);

                                if (img.isDir) {
                                    return (
                                        <div
                                            key={img.path}
                                            data-path={img.path}
                                            className={clsx(
                                                "group relative bg-base-100/50 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden aspect-square flex flex-col cursor-pointer",
                                                "ring-2 ring-offset-2 ring-offset-base-200",
                                                isSelected ? "ring-primary scale-[0.98]" : "ring-transparent border border-base-300 hover:border-primary/50"
                                            )}
                                            onMouseDown={(e) => handleItemMouseDown(e, img.path)}
                                            onMouseEnter={() => handleItemMouseEnter(img.path)}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentPath(img.path);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Could add a highlight class here
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const sourcePath = e.dataTransfer.getData('text/plain');
                                                if (sourcePath && sourcePath !== img.path) {
                                                    // Only move if source is not inside target to prevent recursive loop issues natively.
                                                    // Basic check to prevent dragging a folder onto itself or into its own subfolder.
                                                    if (!img.path.startsWith(sourcePath + '/')) {
                                                        handleMoveAsset(sourcePath, img.path);
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="flex-1 flex items-center justify-center bg-base-200/30 pointer-events-none">
                                                <Folder size={48} className="text-primary/70 group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className={clsx(
                                                "p-2 text-xs font-bold text-center truncate border-t border-base-300 pointer-events-none transition-colors",
                                                isSelected ? "bg-primary text-primary-content" : "bg-base-200/50 text-base-content/80"
                                            )}>
                                                {img.name}
                                            </div>

                                            {/* Selection Checkbox Indicator */}
                                            {!onSelect && (
                                                <div className={clsx(
                                                    "absolute top-2 left-2 rounded shadow-sm transition-all pointer-events-none flex items-center justify-center bg-base-100",
                                                    isSelected ? "opacity-100 scale-100 text-primary" : "opacity-0 scale-95 text-base-content/30 group-hover:opacity-100"
                                                )}>
                                                    <CheckSquare size={22} className={clsx(isSelected && "fill-primary/20")} strokeWidth={isSelected ? 2.5 : 2} />
                                                </div>
                                            )}

                                            {/* Quick Actions for Folder */}
                                            {!onSelect && !isSelected && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                                                    <button
                                                        className="btn btn-xs btn-circle btn-ghost bg-base-100/90 hover:bg-base-200 shadow-sm"
                                                        title="Rename Folder"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => handleActionClick(e, () => {
                                                            setRenamingAsset({ path: img.path, oldName: img.name });
                                                            setNewName(img.name);
                                                        })}
                                                    >
                                                        <Edit2 size={12} className="text-base-content/70" />
                                                    </button>
                                                    <button
                                                        className="btn btn-xs btn-circle btn-error shadow-sm hover:shadow-md"
                                                        title="Delete Folder"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => handleActionClick(e, () => setConfirmDelete({ isOpen: true, paths: [img.path] }))}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={img.path}
                                        data-path={img.path}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', img.path);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        className={clsx(
                                            "group relative bg-base-100 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden aspect-square flex flex-col cursor-pointer",
                                            "ring-2 ring-offset-2 ring-offset-base-200",
                                            isSelected ? "ring-primary scale-[0.98]" : "ring-transparent hover:ring-base-300 border border-base-200"
                                        )}
                                        onMouseDown={(e) => handleItemMouseDown(e, img.path)}
                                        onMouseEnter={() => handleItemMouseEnter(img.path)}
                                        onDoubleClick={(e) => {
                                            if (!onSelect) {
                                                e.stopPropagation();
                                                setPreviewAsset(img);
                                            }
                                        }}
                                    >
                                        {/* Image Preview Container */}
                                        <div className="flex-1 relative min-h-0 bg-neutral/5 pattern-checkerboard pattern-opacity-50 flex items-center justify-center p-2 pointer-events-none">
                                            <AssetImage
                                                url={getPreviewUrl(img.path)}
                                                alt={img.name}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            {/* Hover overlay hint for double-click */}
                                            {!onSelect && !isSelected && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Maximize2 className="text-white drop-shadow-md" size={32} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer / Filename */}
                                        <div className={clsx(
                                            "p-2 text-[10px] sm:text-xs font-mono truncate text-center transition-colors pointer-events-none",
                                            isSelected ? "bg-primary text-primary-content font-bold" : "bg-base-100 text-base-content/70 border-t border-base-200"
                                        )}>
                                            {img.name}
                                        </div>

                                        {/* Selection Checkbox Indicator */}
                                        {!onSelect && (
                                            <div className={clsx(
                                                "absolute top-2 left-2 rounded shadow-sm transition-all pointer-events-none flex items-center justify-center bg-base-100",
                                                isSelected ? "opacity-100 scale-100 text-primary" : "opacity-0 scale-95 text-base-content/30 group-hover:opacity-100"
                                            )}>
                                                <CheckSquare size={22} className={clsx(isSelected && "fill-primary/20")} strokeWidth={isSelected ? 2.5 : 2} />
                                            </div>
                                        )}

                                        {/* Quick Actions (shows only on hover if not selected) */}
                                        {!onSelect && !isSelected && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                                                <button
                                                    className="btn btn-xs btn-circle btn-ghost bg-base-100/90 hover:bg-base-200 shadow-sm"
                                                    title="Rename"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => handleActionClick(e, () => {
                                                        setRenamingAsset({ path: img.path, oldName: img.name });
                                                        setNewName(img.name);
                                                    })}
                                                >
                                                    <Edit2 size={12} className="text-base-content/70" />
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-circle btn-ghost bg-base-100/90 hover:bg-base-200 shadow-sm"
                                                    title="Copy"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => handleActionClick(e, () => handleCopyAsset(img.path))}
                                                >
                                                    <Copy size={12} className="text-base-content/70" />
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-circle btn-error shadow-sm hover:shadow-md"
                                                    title="Delete this asset"
                                                    onMouseDown={(e) => e.stopPropagation()} // prevent selection
                                                    onClick={(e) => handleActionClick(e, () => setConfirmDelete({ isOpen: true, paths: [img.path] }))}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Full-Screen Drag Hint Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center border-4 border-primary border-dashed z-[80] pointer-events-none transition-all">
                        <div className="bg-base-100 px-10 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
                            <Upload size={64} className="text-primary" />
                            <div className="text-3xl font-black text-primary">Drop anywhere to upload</div>
                            <p className="text-base-content/50">Images will be added to project assets</p>
                        </div>
                    </div>
                )}

                {/* Fullscreen Preview Overlay */}
                {previewAsset && (
                    <div
                        className="absolute inset-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200"
                        onDoubleClick={() => setPreviewAsset(null)}
                    >
                        <div className="flex justify-between items-center p-4 text-white/70 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
                            <span className="font-mono text-sm bg-black/50 px-3 py-1 rounded w-fit">{previewAsset.name}</span>
                            <button
                                className="btn btn-ghost btn-circle text-white hover:bg-white/20"
                                onClick={() => setPreviewAsset(null)}
                                title="Close Preview (or double-click anywhere)"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 relative w-full h-full flex items-center justify-center p-8 bg-neutral/10 pattern-checkerboard pattern-opacity-10">
                            <AssetImage
                                url={getPreviewUrl(previewAsset.path)}
                                alt={previewAsset.name}
                                className="max-w-full max-h-full object-contain rounded drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform duration-300"
                            />
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {confirmDelete.isOpen && (
                    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="modal-box bg-base-100 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="font-black text-xl text-error flex items-center gap-3">
                                <span className="bg-error/10 p-2 rounded-full text-error">
                                    <Trash2 size={24} />
                                </span>
                                Confirm Deletion
                            </h3>
                            <p className="py-6 text-base text-base-content/80">
                                Are you sure you want to permanently delete
                                <strong className="text-base-content mx-1 text-lg">{confirmDelete.paths.length}</strong>
                                asset(s)?
                                <br />
                                <span className="text-sm text-error/80 mt-2 block font-medium">This action cannot be undone.</span>
                            </p>
                            <div className="modal-action">
                                <button className="btn btn-ghost font-bold" onClick={() => setConfirmDelete({ isOpen: false, paths: [] })}>
                                    Cancel
                                </button>
                                <button className="btn btn-error shadow-md" onClick={handleConfirmDelete}>
                                    Delete {confirmDelete.paths.length} Item(s)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rename Modal */}
                {renamingAsset && (
                    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="modal-box bg-base-100 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="font-bold text-xl flex items-center gap-3 mb-4">
                                <span className="bg-primary/10 p-2 rounded-full text-primary">
                                    <Edit2 size={24} />
                                </span>
                                Rename Asset
                            </h3>
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">New Name</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameSubmit();
                                        if (e.key === 'Escape') setRenamingAsset(null);
                                    }}
                                />
                            </div>
                            <div className="modal-action mt-6">
                                <button className="btn btn-ghost" onClick={() => setRenamingAsset(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRenameSubmit}
                                    disabled={!newName.trim() || newName.trim() === renamingAsset.oldName}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Conflict Modal */}
                {uploadConflicts.length > 0 && (
                    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="modal-box bg-base-100 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="font-bold text-xl text-warning flex items-center gap-3 mb-4">
                                <span className="bg-warning/10 p-2 rounded-full text-warning">
                                    <Upload size={24} />
                                </span>
                                File Name Conflict
                            </h3>
                            <p className="py-2 text-base">
                                <strong>{uploadConflicts.length}</strong> file(s) already exist in project assets.
                                Do you want to replace them?
                            </p>

                            <div className="max-h-[150px] overflow-y-auto bg-base-200/50 p-3 rounded-lg my-3 border border-base-300">
                                <ul className="list-disc list-inside text-sm font-mono opacity-80">
                                    {uploadConflicts.slice(0, 5).map(f => (
                                        <li key={f.name} className="truncate">{f.name}</li>
                                    ))}
                                    {uploadConflicts.length > 5 && (
                                        <li className="list-none text-xs italic mt-1 text-base-content/50">
                                            ... and {uploadConflicts.length - 5} more
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="modal-action mt-6 flex justify-between items-center w-full">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setUploadConflicts([]);
                                        setPendingNonConflicts([]);
                                    }}
                                >
                                    Cancel All
                                </button>
                                <div className="flex gap-2">
                                    {pendingNonConflicts.length > 0 && (
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                processUpload(pendingNonConflicts);
                                                setUploadConflicts([]);
                                                setPendingNonConflicts([]);
                                            }}
                                        >
                                            Skip Duplicates
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-warning shadow-md"
                                        onClick={() => {
                                            processUpload([...pendingNonConflicts, ...uploadConflicts]);
                                            setUploadConflicts([]);
                                            setPendingNonConflicts([]);
                                        }}
                                    >
                                        Overwrite All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Folder Modal */}
                {isCreatingFolder && (
                    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="modal-box bg-base-100 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="font-bold text-xl flex items-center gap-3 mb-4">
                                <span className="bg-primary/10 p-2 rounded-full text-primary">
                                    <FolderPlus size={24} />
                                </span>
                                New Folder
                            </h3>
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Folder Name</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={newFolderName}
                                    placeholder="e.g. backgrounds"
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateFolder();
                                        if (e.key === 'Escape') setIsCreatingFolder(false);
                                    }}
                                />
                            </div>
                            <div className="modal-action mt-6">
                                <button className="btn btn-ghost" onClick={() => setIsCreatingFolder(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim()}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lasso Box Rendering */}
                {lassoStart && lassoCurrent && (
                    <div
                        className="fixed border border-primary bg-primary/20 pointer-events-none z-[110]"
                        style={{
                            left: Math.min(lassoStart.x, lassoCurrent.x),
                            top: Math.min(lassoStart.y, lassoCurrent.y),
                            width: Math.abs(lassoCurrent.x - lassoStart.x),
                            height: Math.abs(lassoCurrent.y - lassoStart.y),
                        }}
                    />
                )}
            </div>
        </div>
    );
};
