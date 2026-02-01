import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RefreshCw, Download, Save, MousePointer, X, Copy } from 'lucide-react';
import clsx from 'clsx';

const API_Base = 'http://localhost:8080/api';

interface ScreenshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
    isOpen, onClose, deviceId
}) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    // Asset saving state
    const [isSaving, setIsSaving] = useState(false);
    const [filename, setFilename] = useState(`screenshot_${new Date().getTime()}.png`);

    const fetchScreenshot = async () => {
        if (!deviceId) return;
        setLoading(true);
        setError(null);
        try {
            // Add timestamp to prevent caching
            const url = `${API_Base}/devices/${deviceId}/screenshot?t=${new Date().getTime()}`;
            // Preload image to ensure it's valid
            const img = new Image();
            img.src = url;
            img.onload = () => {
                setImageUrl(url);
                setLoading(false);
            };
            img.onerror = () => {
                setError("Failed to load screenshot. Is device connected?");
                setLoading(false);
            };
        } catch (err) {
            setError("Error fetching screenshot");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && deviceId) {
            fetchScreenshot();
        } else {
            setImageUrl(null);
        }
    }, [isOpen, deviceId]);



    const [size, setSize] = useState({ width: 1280, height: 800 });
    const isResizing = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Selection / Cropping State
    const [selection, setSelection] = useState<{ start: { x: number, y: number } | null, end: { x: number, y: number } | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        // ... resizing logic ...
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing.current) {
                const dx = e.clientX - lastMousePos.current.x;
                const dy = e.clientY - lastMousePos.current.y;
                setSize(prev => ({
                    width: Math.max(800, prev.width + dx),
                    height: Math.max(600, prev.height + dy)
                }));
                lastMousePos.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseUp = () => {
            if (isResizing.current) {
                isResizing.current = false;
                document.body.style.cursor = 'default';
            }
            if (isSelecting) {
                setIsSelecting(false);
                // Ensure valid selection
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isSelecting]);

    const startResize = (e: React.MouseEvent) => {
        isResizing.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'se-resize';
        e.preventDefault();
    };

    const handleImageMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
        e.preventDefault(); // Prevent drag
        if (!imageRef.current) return;

        // Start selection
        const rect = imageRef.current.getBoundingClientRect();
        // Store relative DOM coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelection({ start: { x, y }, end: { x, y } });
        setIsSelecting(true);
        // Reset filename for template
        setFilename(`template_${new Date().getTime()}.png`);
    };

    const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();

        // Calculate natural coords for Inspector
        const scaleX = imageRef.current.naturalWidth / rect.width;
        const scaleY = imageRef.current.naturalHeight / rect.height;
        const naturalX = Math.floor((e.clientX - rect.left) * scaleX);
        const naturalY = Math.floor((e.clientY - rect.top) * scaleY);
        setMousePos({ x: naturalX, y: naturalY });

        // Update Selection if selecting
        if (isSelecting && selection.start) {
            const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
            const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);
            setSelection(prev => ({ ...prev, end: { x, y } }));
        }
    };

    const getSelectionRect = () => {
        if (!selection.start || !selection.end) return null;
        const x = Math.min(selection.start.x, selection.end.x);
        const y = Math.min(selection.start.y, selection.end.y);
        const w = Math.abs(selection.end.x - selection.start.x);
        const h = Math.abs(selection.end.y - selection.start.y);
        return { x, y, w, h };
    };

    const getCroppedBlob = async (): Promise<Blob | null> => {
        if (!imageRef.current || !imageUrl) return null;
        if (!selection.start || !selection.end) return null;

        const rect = getSelectionRect();
        if (!rect || rect.w < 5 || rect.h < 5) return null; // Too small

        const canvas = document.createElement('canvas');
        const img = imageRef.current;
        const scaleX = img.naturalWidth / img.getBoundingClientRect().width;
        const scaleY = img.naturalHeight / img.getBoundingClientRect().height;

        canvas.width = rect.w * scaleX;
        canvas.height = rect.h * scaleY;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(
            img,
            rect.x * scaleX, rect.y * scaleY, rect.w * scaleX, rect.h * scaleY, // Source
            0, 0, canvas.width, canvas.height // Dest
        );

        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    };

    const handleSaveAsset = async () => {
        if (!imageUrl) return;

        setIsSaving(true);
        try {
            let blob: Blob | null = null;
            const selRect = getSelectionRect();

            if (selRect && selRect.w > 5) {
                // Crop
                blob = await getCroppedBlob();
            } else {
                // Full
                const response = await fetch(imageUrl);
                blob = await response.blob();
            }

            if (!blob) throw new Error("Failed to create image blob");

            const formData = new FormData();
            formData.append('file', blob, filename);

            const res = await axios.post(`${API_Base}/assets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert(`Saved to ${res.data.path}`);
        } catch (err: any) {
            alert("Failed to save: " + (err.response?.data?.error || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                className="bg-base-100 rounded-xl flex flex-col shadow-2xl border border-base-200 overflow-hidden relative"
                style={{ width: size.width, height: size.height, maxWidth: '100%', maxHeight: '100%' }}
            >
                {/* Header */}
                <div className="h-14 px-4 border-b border-base-200 flex items-center justify-between shrink-0 bg-base-100 cursor-move">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">Device Screenshot</h3>
                        <div className="badge badge-neutral font-mono">{deviceId}</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={fetchScreenshot}
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                            Refresh
                        </button>
                        <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex bg-base-200/50">
                    {/* Image Preview */}
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
                        {error ? (
                            <div className="text-error flex flex-col items-center">
                                <span className="font-bold">Error</span>
                                <span>{error}</span>
                            </div>
                        ) : imageUrl ? (
                            <div className="relative inline-block shadow-lg border border-black/10 mx-auto select-none"
                                onMouseDown={(e) => e.preventDefault()} // Prevent default drag
                            >
                                <img
                                    ref={imageRef}
                                    src={imageUrl}
                                    alt="Screenshot"
                                    className={clsx("max-h-full object-contain cursor-crosshair", isSelecting && "cursor-crosshair")}
                                    onMouseMove={handleImageMouseMove}
                                    onMouseDown={handleImageMouseDown}
                                    draggable={false}
                                />
                                {/* Selection Overlay */}
                                {selection.start && selection.end && (
                                    <div
                                        className="absolute border-2 border-green-500 bg-green-500/20 pointer-events-none"
                                        style={{
                                            left: Math.min(selection.start.x, selection.end.x),
                                            top: Math.min(selection.start.y, selection.end.y),
                                            width: Math.abs(selection.end.x - selection.start.x),
                                            height: Math.abs(selection.end.y - selection.start.y)
                                        }}
                                    >
                                        {/* Dimensions Badge */}
                                        <div className="absolute -top-6 left-0 bg-green-600 text-white text-[10px] px-1 rounded">
                                            {Math.round(Math.abs(selection.end.x - selection.start.x) * (imageRef.current?.naturalWidth || 0) / (imageRef.current?.getBoundingClientRect().width || 1))} x
                                            {Math.round(Math.abs(selection.end.y - selection.start.y) * (imageRef.current?.naturalHeight || 0) / (imageRef.current?.getBoundingClientRect().height || 1))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="loading loading-spinner loading-lg opacity-50"></div>
                        )}

                        {/* Inspect Info Overlay */}
                        {imageUrl && !loading && (
                            <div className="absolute bottom-4 left-4 bg-black/75 text-white p-2 rounded-lg text-sm font-mono shadow-lg flex flex-col gap-1 pointer-events-none z-10">
                                <div className="flex items-center gap-2">
                                    <MousePointer size={12} />
                                    <span>X: {mousePos.x}, Y: {mousePos.y}</span>
                                </div>
                                {imageRef.current && (
                                    <div className="opacity-50 text-xs">
                                        Res: {imageRef.current.naturalWidth}x{imageRef.current.naturalHeight}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Tools */}
                    <div className="w-80 bg-base-100 border-l border-base-200 p-4 flex flex-col gap-4 shrink-0">
                        <div>
                            <h4 className="font-bold text-sm uppercase opacity-50 mb-2">Actions</h4>
                            <div className="grid gap-2">
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text">Filename</span></label>
                                    <input
                                        type="text"
                                        className="input input-sm input-bordered"
                                        value={filename}
                                        onChange={e => setFilename(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleSaveAsset}
                                    disabled={!imageUrl || loading || isSaving}
                                >
                                    {isSaving ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} />}
                                    Save to Assets
                                </button>
                                <a
                                    href={imageUrl || '#'}
                                    download={filename}
                                    className={clsx("btn btn-sm btn-ghost border-base-300", (!imageUrl || loading) && "btn-disabled")}
                                >
                                    <Download size={16} /> Download
                                </a>
                            </div>
                        </div>

                        <div className="divider my-0"></div>

                        <div className="flex-1">
                            <h4 className="font-bold text-sm uppercase opacity-50 mb-2">Code Sniplets</h4>
                            <div className="space-y-2">
                                <div className="p-2 bg-base-200 rounded text-xs font-mono break-all cursor-pointer hover:bg-base-300 transition-colors"
                                    onClick={() => { navigator.clipboard.writeText(`self.platform.click(${mousePos.x}, ${mousePos.y})`); }}
                                    title="Click to copy"
                                >
                                    {getSelectionRect() && getSelectionRect()!.w > 5 ? (
                                        <>
                                            <div className="flex justify-between items-center opacity-50 mb-1">
                                                <span>Click Image</span>
                                                <Copy size={10} />
                                            </div>
                                            self.platform.click_image("assets/{filename}")
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center opacity-50 mb-1">
                                                <span>Click</span>
                                                <Copy size={10} />
                                            </div>
                                            self.platform.click({mousePos.x}, {mousePos.y})
                                        </>
                                    )}
                                </div>

                                <div className="p-2 bg-base-200 rounded text-xs font-mono break-all cursor-pointer hover:bg-base-300 transition-colors"
                                    onClick={() => { navigator.clipboard.writeText(`assets/${filename}`); }}
                                    title="Click to copy path"
                                >
                                    <div className="flex justify-between items-center opacity-50 mb-1">
                                        <span>Asset Path</span>
                                        <Copy size={10} />
                                    </div>
                                    "assets/{filename}"
                                </div>

                                {getSelectionRect() && getSelectionRect()!.w > 5 && (
                                    <div className="p-2 bg-base-200 rounded text-xs font-mono break-all cursor-pointer hover:bg-base-300 transition-colors"
                                        onClick={() => { navigator.clipboard.writeText(`self.platform.find_image("assets/${filename}")`); }}
                                        title="Click to copy"
                                    >
                                        <div className="flex justify-between items-center opacity-50 mb-1">
                                            <span>Find Image</span>
                                            <Copy size={10} />
                                        </div>
                                        self.platform.find_image("assets/{filename}")
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                        onMouseDown={startResize}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transform rotate-0">
                            <path d="M11 1L11 11L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
