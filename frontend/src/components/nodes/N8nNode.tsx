import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, useHandleConnections, useStore } from '@xyflow/react';
import {
    Check, Loader2, Play, Eye, EyeOff, Trash2, MoreHorizontal, Plus, AlertTriangle, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { getNodeDef } from '../../workflow/nodeRegistry';

// Separate component for Output Handle to use hooks safely
const N8nOutputHandle = ({ source, nodeId, index, total, type }: { source: any, nodeId: string, index: number, total: number, type: string }) => {
    // Check if this handle has connections
    const connections = useHandleConnections({
        type: 'source',
        id: source.id,
        nodeId: nodeId
    });
    const isConnected = connections.length > 0;

    // Check if we are currently dragging from THIS handle
    const isConnecting = useStore((s: any) =>
        s.connection?.fromNode?.id === nodeId && s.connection?.fromHandle?.id === source.id
    );

    const handleRef = useRef<HTMLDivElement>(null);
    const clickStartRef = useRef<number>(0);
    const mouseStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Distribute handles vertically on the right
    const top = total === 1 ? '50%' : `${((index + 1) * 100) / (total + 1)}%`;

    const onStubMouseDown = (e: React.MouseEvent) => {
        // ONLY Allow Left Click (button 0)
        if (e.button !== 0) return;

        // Record start time and position for click detection
        clickStartRef.current = Date.now();
        mouseStartRef.current = { x: e.clientX, y: e.clientY };

        // Forward the mousedown event to the actual handle to trigger React Flow connection dragging
        if (handleRef.current) {
            e.preventDefault();
            e.stopPropagation();

            const event = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: e.clientX,
                clientY: e.clientY,
                buttons: 1
            });

            // We need to dispatch to the handle element itself
            const handleEl = handleRef.current.querySelector('.react-flow__handle') || handleRef.current;
            handleEl.dispatchEvent(event);
        }
    };

    const onStubMouseUp = (e: React.MouseEvent) => {
        const duration = Date.now() - clickStartRef.current;
        const dist = Math.sqrt(
            Math.pow(e.clientX - mouseStartRef.current.x, 2) +
            Math.pow(e.clientY - mouseStartRef.current.y, 2)
        );

        if (duration < 250 && dist < 5) {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('workflow-quick-add', {
                detail: { x: 0, y: 0, sourceNodeId: nodeId, sourceHandleId: source.id }
            }));
        }
    };

    return (
        <div
            className="absolute right-0 flex items-center group/stub pointer-events-auto z-20"
            style={{ top, transform: 'translate(50%, -50%)' }}
        >
            {/* The Handle Dot (Interactable & Visual) */}
            <div
                ref={handleRef}
                className={clsx(
                    "relative w-3.5 h-3.5 rounded-full bg-white border hover:scale-110 transition-all shadow-sm cursor-crosshair flex items-center justify-center",
                    isConnected ? "border-gray-400 bg-gray-50" : "border-gray-400 hover:border-primary"
                )}
            >
                {/* Inner dot for unconnected state */}
                {!isConnected && <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />}

                <Handle
                    type="source"
                    position={Position.Right}
                    id={source.id}
                    className="!opacity-0 !absolute !inset-0 !w-full !h-full !border-0 cursor-crosshair"
                />
            </div>

            {/* Unconnected STUB (Line + Plus) - Persistent when not connected AND not dragging from it */}
            {!isConnected && !isConnecting && (
                <div
                    className="absolute left-[6px] flex items-center pointer-events-none group-hover/stub:pointer-events-auto nodrag opacity-0 group-hover/stub:opacity-100 transition-opacity duration-200 pl-1"
                    onMouseDown={onStubMouseDown}
                    onMouseUp={onStubMouseUp}
                >
                    {/* Connecting Line */}
                    <div className="w-4 h-[2px] bg-gray-300" />

                    {/* Plus Button */}
                    <div
                        className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-500 shadow-sm cursor-pointer hover:border-primary hover:text-primary hover:scale-110 transition-all pointer-events-auto"
                    >
                        <Plus size={12} strokeWidth={3} />
                    </div>
                </div>
            )}

            {/* Label (Outside Handle) */}
            {source.label && total > 1 && (
                <div className={clsx(
                    "absolute right-full mr-5 pointer-events-none whitespace-nowrap text-[10px] font-medium px-1.5 py-0.5 rounded transition-opacity z-20",
                    (type === 'if_condition' || type === 'switch')
                        ? "text-gray-500 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
                        : "bg-gray-800 text-white shadow-md opacity-0 group-hover/stub:opacity-100"
                )}>
                    {source.label}
                </div>
            )}
        </div>
    );
};

export const N8nNode = ({ data, id, type, selected }: NodeProps<Node>) => {
    const nodeType = (type || (data.nodeType as string) || 'click');
    const def = getNodeDef(nodeType);
    const IconComp = def?.icon;
    const [hovered, setHovered] = useState(false);

    // [DIAGNOSTIC] Log state changes to verify React reactivity in Wails WebView2
    useEffect(() => {
        if (data.status === 'running') {
            console.log(`[DIAGNOSTIC] Node ${id} state: RUNNING`, { data });
        }
    }, [id, data.status]);

    // Status Logic
    const isRunning = data.status === 'running';
    const isSuccess = data.status === 'success';
    const isError = data.status === 'error';
    const isDisabled = !!data.disabled;
    const isWarning = !!data.warning; // Explicit warning prop

    const isTrigger = def?.group === 'Trigger' || type === 'manual_trigger' || def?.type === 'start'; // Hypothetical start node check

    return (
        <div
            className="group relative flex flex-col items-center font-sans"
            style={{ width: '72px' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* 1. Node Card */}
            <div
                className={clsx(
                    "relative flex items-center justify-center w-[72px] h-[72px] bg-white transition-all duration-200 z-10",
                    "rounded-2xl border-[1.5px]",
                    selected ? "border-primary ring-2 ring-primary/20 shadow-lg scale-105" : "border-gray-200 shadow hover:shadow-md hover:border-gray-300",
                    isSuccess && !isRunning && "border-[#4fcc5d] bg-[#4fcc5d]/5",
                    isRunning && "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-50/10",
                    isError && "border-red-500 bg-red-50/10",
                    isDisabled && "opacity-60 grayscale bg-gray-50"
                )}
            >
                {/* Border Flow & Revolving Dot for Running state */}
                {isRunning && (
                    <>
                        <div className="n8n-node-running-border" />
                        <div className="n8n-node-dot" />
                    </>
                )}
                {/* Trigger Icon Overlay (Lightning Bolt) - if applicable */}
                {isTrigger && (
                    <div className="absolute -top-2.5 -left-2.5 z-20 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-yellow-500">
                        <Zap size={12} fill="currentColor" />
                    </div>
                )}

                {/* Icon Section */}
                <div className="relative w-10 h-10 flex items-center justify-center transition-colors text-gray-600">
                    {data.imagePreview ? (
                        <img
                            src={data.imagePreview as string}
                            alt="Node Preview"
                            className="w-full h-full object-contain rounded-[8px]"
                            loading="lazy"
                            draggable={false}
                        />
                    ) : (
                        IconComp ? <IconComp size={32} strokeWidth={1.5} /> : <div className="text-[10px] font-bold">Node</div>
                    )}
                </div>

                {/* Status Badges (Bottom-Right Corner) */}
                <div className="absolute -bottom-2 -right-2 z-30 flex">
                    {isRunning && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full border-[2px] border-white flex items-center justify-center shadow-sm">
                            <Loader2 size={10} strokeWidth={4} className="text-white animate-spin" />
                        </div>
                    )}
                    {isSuccess && !isRunning && (
                        <div className="w-5 h-5 bg-[#4fcc5d] rounded-full border-[2px] border-white flex items-center justify-center shadow-sm">
                            <Check size={10} strokeWidth={4} className="text-white" />
                        </div>
                    )}
                    {isError && !isRunning && (
                        <div className="w-5 h-5 bg-[#ff6d5b] rounded-full border-[2px] border-white flex items-center justify-center shadow-sm">
                            <span className="text-white text-[10px] font-black leading-none mt-[1px]">!</span>
                        </div>
                    )}
                </div>

                {/* Warning Indicator (Top-Right Corner) */}
                {isWarning && !isRunning && !isError && (
                    <div className="absolute -top-2 -right-2 z-20 bg-white rounded-full border border-gray-200 p-0.5 shadow-sm text-yellow-500" title="Configuration Warning">
                        <AlertTriangle size={12} fill="currentColor" className="text-white stroke-yellow-500" />
                    </div>
                )}



                {/* Input Handle (Left Edge) */}
                {!isTrigger && (
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-gray-400 rounded-full z-20 shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <Handle
                            type="target"
                            position={Position.Left}
                            isConnectableStart={false}
                            className="!opacity-0 !w-full !h-full !border-0"
                        />
                    </div>
                )}

                {/* Output Handles (Right Edge) */}
                {(() => {
                    const config = def?.handleConfig;
                    let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                    if (type === 'switch') {
                        const caseStr = (data as any).config?.cases;
                        try {
                            const cases = typeof caseStr === 'string' ? JSON.parse(caseStr) : caseStr;
                            if (Array.isArray(cases)) {
                                const caseHandles = cases.map((caseVal: any, i: number) => ({
                                    id: `${i}`,
                                    label: typeof caseVal === 'object' ? JSON.stringify(caseVal) : String(caseVal)
                                }));
                                sources = [...caseHandles, { id: 'default', label: 'Default' }];
                            }
                        } catch { }
                    }

                    return sources.map((source: any, index: number) => (
                        <N8nOutputHandle
                            key={source.id}
                            source={source}
                            nodeId={id}
                            index={index}
                            total={sources.length}
                            type={type || ''}
                        />
                    ));
                })()}
            </div>

            {/* Floating Text Section (Bottom) */}
            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 flex flex-col items-center min-w-[140px] pointer-events-none z-20">
                <span className={clsx(
                    "text-[13px] font-bold text-center leading-tight mb-0.5",
                    selected ? "text-primary px-1.5 bg-white/90 rounded-md backdrop-blur-sm shadow-sm" : "text-gray-700"
                )} style={selected ? {} : { textShadow: '0px 1px 2px rgba(255,255,255,0.8), 0px -1px 2px rgba(255,255,255,0.8)' }}>
                    {(data.label as string) || def?.label || 'Node'}
                </span>
                <span className="text-[11px] text-gray-500 text-center font-medium max-w-[160px] truncate bg-white/60 px-1 rounded-sm">
                    {(data.subtitle as string) || def?.description || nodeType}
                </span>
            </div>


            {/* 3. Floating Toolbar (Above Node) */}
            <div className={clsx(
                "absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white shadow-xl border border-gray-100 z-50 transition-all duration-200",
                (hovered || selected) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            )}>
                <button
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                    title="Execute Step"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-execute', { detail: { nodeId: id } }));
                    }}
                >
                    <Play size={14} fill="currentColor" />
                </button>
                <button
                    className={clsx(
                        "p-1.5 rounded-full hover:bg-gray-100 transition-colors",
                        isDisabled ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-primary"
                    )}
                    title={isDisabled ? "Enable Step" : "Disable Step"}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-toggle', { detail: { nodeId: id, disabled: !isDisabled } }));
                    }}
                >
                    {isDisabled ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                    className="p-1.5 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete Step"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-delete', { detail: { nodeId: id } }));
                    }}
                >
                    <Trash2 size={14} />
                </button>
                <div className="w-px h-3 bg-gray-200 mx-0.5" />
                <button
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                    title="More Actions"
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        window.dispatchEvent(new CustomEvent('workflow-context-menu', {
                            detail: { type: 'node', x: rect.right, y: rect.bottom, id, data }
                        }));
                    }}
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>
        </div>
    );
};
