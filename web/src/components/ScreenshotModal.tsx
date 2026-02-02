import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RefreshCw, Save, MousePointer, X, Copy, RotateCcw, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';

const API_Base = 'http://localhost:8080/api';

interface ScreenshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
    isOpen, onClose, deviceId
}) => {
    const { activeTabId, scriptTabs } = useAppStore();
    const activeTab = scriptTabs.find(t => t.tabId === activeTabId);

    // Core State
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };
    const imageRef = useRef<HTMLImageElement>(null);

    // Asset saving state
    const [isSaving, setIsSaving] = useState(false);
    const [filename, setFilename] = useState(`screenshot_${new Date().getTime()}.png`);

    // UI/UX State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Resizing State
    const [size, setSize] = useState({ width: 1280, height: 800 });
    const [regionPaddingX, setRegionPaddingX] = useState(5);
    const [regionPaddingY, setRegionPaddingY] = useState(5);
    const isResizing = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Selection / Cropping State
    const [selection, setSelection] = useState<{ start: { x: number, y: number } | null, end: { x: number, y: number } | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const resetSelection = () => {
        setSelection({ start: null, end: null });
        setIsSelecting(false);
        setFilename(`screenshot_${new Date().getTime()}.png`);
    };

    const fetchScreenshot = async () => {
        if (!deviceId) return;
        setLoading(true);
        setError(null);
        try {
            // Add timestamp to prevent caching
            const url = `${API_Base}/devices/${deviceId}/screenshot?t=${new Date().getTime()}`;
            // Preload image to ensure it's valid
            const img = new Image();
            img.crossOrigin = "anonymous"; // Enable CORS
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

    useEffect(() => {
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
        const img = imageRef.current; // imageRef is NOT tainted if loaded with CORS

        // Double check crossOrigin attr on imageRef
        if (!img.crossOrigin) {
            console.warn("Image missing crossOrigin attribute");
        }

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

            // Append active script ID if available
            const activeTab = scriptTabs.find(t => t.tabId === activeTabId);
            if (activeTab) {
                formData.append('scriptId', activeTab.scriptId);
            }

            const res = await axios.post(`${API_Base}/assets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showToast(`Saved to ${res.data.path}`, 'success');
        } catch (err: any) {
            console.error(err);
            // Handle tainted canvas error specifically if it happens despite fixes
            if (err.message && err.message.includes("Tainted")) {
                showToast("Failed: Canvas is tainted (CORS issue). Check server headers.", 'error');
            } else {
                showToast("Failed to save: " + (err.response?.data?.error || err.message), 'error');
            }
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
                        {/* Reset Selection Button */}
                        {(selection.start && selection.end) && (
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={resetSelection}
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                        )}

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
                                    crossOrigin="anonymous"
                                    className={clsx("max-h-full object-contain cursor-crosshair", isSelecting && "cursor-crosshair")}
                                    onMouseMove={handleImageMouseMove}
                                    onMouseDown={handleImageMouseDown}
                                    draggable={false}
                                />
                                {/* Selection Rect */}
                                {getSelectionRect() && (
                                    <>
                                        {/* Search Region (Dashed) */}
                                        <div
                                            className="absolute border border-dashed border-success/40 pointer-events-none"
                                            style={{
                                                left: getSelectionRect()!.x - (regionPaddingX / (imageRef.current?.naturalWidth || 1)) * (imageRef.current?.getBoundingClientRect().width || 0),
                                                top: getSelectionRect()!.y - (regionPaddingY / (imageRef.current?.naturalHeight || 1)) * (imageRef.current?.getBoundingClientRect().height || 0),
                                                width: getSelectionRect()!.w + (regionPaddingX * 2 / (imageRef.current?.naturalWidth || 1)) * (imageRef.current?.getBoundingClientRect().width || 0),
                                                height: getSelectionRect()!.h + (regionPaddingY * 2 / (imageRef.current?.naturalHeight || 1)) * (imageRef.current?.getBoundingClientRect().height || 0),
                                                transition: 'all 0.1s ease-out'
                                            }}
                                        >
                                            <div className="absolute -top-4 left-0 text-[10px] text-success/60 font-mono">Search Region</div>
                                        </div>

                                        {/* Actual Selection */}
                                        <div
                                            className="absolute border-2 border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] pointer-events-none"
                                            style={{
                                                left: getSelectionRect()!.x,
                                                top: getSelectionRect()!.y,
                                                width: getSelectionRect()!.w,
                                                height: getSelectionRect()!.h,
                                            }}
                                        >
                                            <div className="absolute -top-6 left-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg font-bold flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                                {Math.round(getSelectionRect()!.w * (imageRef.current?.naturalWidth || 0) / (imageRef.current?.getBoundingClientRect().width || 1))} x
                                                {Math.round(getSelectionRect()!.h * (imageRef.current?.naturalHeight || 0) / (imageRef.current?.getBoundingClientRect().height || 1))}
                                            </div>
                                        </div>
                                    </>
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
                    <div className="w-80 bg-base-100 border-l border-base-200 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
                        <div>
                            <h4 className="font-bold text-sm uppercase opacity-50 mb-2">Actions</h4>

                            <div className="p-3 bg-base-200 rounded-xl space-y-3 border border-base-300 mb-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-1 block">
                                        Target Location:
                                    </label>
                                    <div className="flex items-center gap-2 text-warning animate-pulse px-1">
                                        <span className="p-1 bg-warning/10 rounded"><Save size={12} /></span>
                                        <span className="text-xs font-mono truncate">{activeTab ? `${activeTab.label}/images` : "Global Assets"}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] uppercase opacity-30 block mb-1 font-bold">Region Padding X</label>
                                        <input
                                            type="number"
                                            className="input input-xs input-bordered w-full bg-base-300 font-mono"
                                            value={regionPaddingX}
                                            onChange={(e) => setRegionPaddingX(Number(e.target.value))}
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase opacity-30 block mb-1 font-bold">Region Padding Y</label>
                                        <input
                                            type="number"
                                            className="input input-xs input-bordered w-full bg-base-300 font-mono"
                                            value={regionPaddingY}
                                            onChange={(e) => setRegionPaddingY(Number(e.target.value))}
                                            min={0}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase opacity-30 block mb-1 font-bold">Filename</label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                        className="input input-bordered w-full h-8 text-xs font-mono bg-base-300 selection:bg-primary/20"
                                        placeholder="asset_name.png"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveAsset}
                                    disabled={isSaving || !imageUrl}
                                    className={clsx(
                                        "btn btn-primary btn-sm w-full gap-2 shadow-lg transition-all",
                                        isSaving && "loading"
                                    )}
                                >
                                    <Save size={16} />
                                    {isSaving ? "Saving..." : "Save to Assets"}
                                </button>
                            </div>

                            <h4 className="font-bold text-sm uppercase opacity-50 mb-2">Code Sniplets</h4>
                            <div className="space-y-2 pb-10">
                                {/* click_image_full */}
                                <div className={clsx(
                                    "rounded-xl overflow-hidden border transition-all duration-300 group selection:bg-success/20 cursor-pointer",
                                    copiedId === 'click_full' ? "border-success bg-success/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]" : "border-base-300 bg-neutral hover:border-primary/50"
                                )}
                                    onClick={() => handleCopy('click_full', `self.platform.click_image_full("assets/${filename}", self.deviceId)`)}
                                >
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-base-300/50 border-b border-base-300/30">
                                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">Full Screen Search</div>
                                        {copiedId === 'click_full' ? <Check size={12} className="text-success animate-in zoom-in" /> : <Copy size={12} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
                                    </div>
                                    <div className="p-3 font-mono text-[11px] text-success/80">
                                        self.platform.click_image_full("assets/{filename}", self.deviceId)
                                    </div>
                                </div>

                                {/* click_image_with_similar */}
                                <div className={clsx(
                                    "rounded-xl overflow-hidden border transition-all duration-300 group selection:bg-success/20 cursor-pointer",
                                    copiedId === 'click_similar' ? "border-success bg-success/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]" : "border-base-300 bg-neutral hover:border-primary/50"
                                )}
                                    onClick={() => handleCopy('click_similar', `self.platform.click_image_with_similar("assets/${filename}", self.default_threshold, self.deviceId)`)}
                                >
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-base-300/50 border-b border-base-300/30">
                                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">Similar Search</div>
                                        {copiedId === 'click_similar' ? <Check size={12} className="text-success animate-in zoom-in" /> : <Copy size={12} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
                                    </div>
                                    <div className="p-3 font-mono text-[11px] text-success/80">
                                        self.platform.click_image_with_similar("assets/{filename}", threshold, self.deviceId)
                                    </div>
                                </div>

                                {/* click_image (Region) */}
                                {getSelectionRect() && getSelectionRect()!.w > 5 && (
                                    <div className={clsx(
                                        "rounded-xl overflow-hidden border transition-all duration-300 group selection:bg-success/20 cursor-pointer",
                                        copiedId === 'click_region' ? "border-success bg-success/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]" : "border-base-300 bg-neutral hover:border-primary/50"
                                    )}
                                        onClick={() => {
                                            const rect = getSelectionRect()!;
                                            const scaleX = imageRef.current!.naturalWidth / imageRef.current!.getBoundingClientRect().width;
                                            const scaleY = imageRef.current!.naturalHeight / imageRef.current!.getBoundingClientRect().height;

                                            const x1 = Math.max(0, Math.floor(rect.x * scaleX) - regionPaddingX);
                                            const y1 = Math.max(0, Math.floor(rect.y * scaleY) - regionPaddingY);
                                            const x2 = Math.min(imageRef.current!.naturalWidth, Math.floor((rect.x + rect.w) * scaleX) + regionPaddingX);
                                            const y2 = Math.min(imageRef.current!.naturalHeight, Math.floor((rect.y + rect.h) * scaleY) + regionPaddingY);

                                            const text = `self.platform.click_image("assets/${filename}", region=[${x1}, ${y1}, ${x2}, ${y2}], device_id=self.deviceId)`;
                                            handleCopy('click_region', text);
                                        }}
                                    >
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-base-300/50 border-b border-base-300/30">
                                            <div className="text-[10px] uppercase tracking-widest font-bold opacity-30 underline decoration-dotted">Region Search</div>
                                            {copiedId === 'click_region' ? <Check size={12} className="text-success animate-in zoom-in" /> : <Copy size={12} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
                                        </div>
                                        <div className="p-3 font-mono text-[11px] text-success/80 leading-relaxed">
                                            self.platform.click_image("assets/{filename}", region=[...], self.deviceId)
                                        </div>
                                    </div>
                                )}

                                {/* Asset Path */}
                                <div className={clsx(
                                    "rounded-xl overflow-hidden border transition-all duration-300 group selection:bg-success/20 cursor-pointer",
                                    copiedId === 'path' ? "border-success bg-success/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]" : "border-base-300 bg-neutral hover:border-primary/50"
                                )}
                                    onClick={() => handleCopy('path', `assets/${filename}`)}
                                >
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-base-300/50 border-b border-base-300/30">
                                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">Asset Path</div>
                                        {copiedId === 'path' ? <Check size={12} className="text-success animate-in zoom-in" /> : <Copy size={12} className="opacity-30 group-hover:opacity-60 transition-opacity" />}
                                    </div>
                                    <div className="p-3 font-mono text-[11px] text-success/80">
                                        "assets/{filename}"
                                    </div>
                                </div>
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

            {/* Toast Notification */}
            {
                toast && (
                    <div className="toast toast-end z-[100]">
                        <div className={clsx("alert", toast.type === 'success' ? "alert-success" : "alert-error")}>
                            <span>{toast.message}</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
