import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, useHandleConnections, useStore } from '@xyflow/react';
import {
    Loader2, Eye, EyeOff, Trash2, Plus, AlertTriangle, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { getNodeDef } from '../../workflow/nodeRegistry';

// Separate component for Output Handle to use hooks safely
const N8nOutputHandle = ({ source, nodeId, index, total }: { source: any, nodeId: string, index: number, total: number }) => {
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

    // Distribute handles vertically on the right
    const top = total === 1 ? '50%' : `${((index + 1) * 100) / (total + 1)}%`;

    const onStubMouseDown = (e: React.MouseEvent) => {
        // ONLY Allow Left Click (button 0)
        if (e.button !== 0) return;

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
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('workflow-quick-add', {
            detail: { x: 0, y: 0, sourceNodeId: nodeId, sourceHandleId: source.id }
        }));
    };

    // Show label for multi-output nodes, or when it's not a generic "success"
    const showLabel = total > 1 || (source.label && source.label !== 'Success');

    return (
        <div
            className="absolute flex items-center pointer-events-auto z-20"
            style={{ top, left: '100%', transform: 'translate(-4px, -50%)' }}
        >
            {/* The Handle Dot (Visual anchor) */}
            <div
                ref={handleRef}
                className={clsx(
                    "relative w-2 h-2 rounded-full cursor-crosshair flex items-center justify-center transition-all shrink-0",
                    isConnected ? "bg-slate-400" : "bg-slate-300 hover:bg-slate-400"
                )}
            >
                <Handle
                    type="source"
                    position={Position.Right}
                    id={source.id}
                    className="!opacity-0 !absolute !border-0 !rounded-none cursor-crosshair"
                    style={{ top: '50%', right: '-3px', transform: 'translateY(-50%)', width: 2, height: 2 }}
                />
            </div>

            {/* n8n-Style: ○ label ——— + strip, always visible when unconnected */}
            {!isConnected && !isConnecting && (
                <div
                    className="flex items-center nodrag pl-0.5 group/strip"
                    onMouseDown={onStubMouseDown}
                    onMouseUp={onStubMouseUp}
                >
                    {/* Label Badge */}
                    {showLabel && (
                        <span className="text-[8px] font-normal tracking-tight px-1 py-0 rounded whitespace-nowrap pointer-events-none select-none text-gray-400">
                            {source.label}
                        </span>
                    )}

                    {/* Connecting Line */}
                    <div className="w-6 h-[1.5px] bg-gray-300 group-hover/strip:bg-gray-400 transition-colors" />

                    {/* Plus Button */}
                    <div
                        className="w-[18px] h-[18px] bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-400 shadow-sm cursor-pointer hover:border-primary hover:text-primary hover:scale-110 transition-all pointer-events-auto group-hover/strip:border-gray-400 group-hover/strip:text-gray-500"
                    >
                        <Plus size={10} strokeWidth={3} />
                    </div>
                </div>
            )}

            {/* Connected state: just show label badge if multi-output */}
            {isConnected && showLabel && (
                <span className="ml-0.5 text-[8px] font-normal tracking-tight px-1 py-0 rounded whitespace-nowrap pointer-events-none select-none text-gray-400">
                    {source.label}
                </span>
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
            className="group relative flex flex-col items-center font-sans z-10 w-[110px]"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* 1. Main Node Box (Square Layout) */}
            <div
                className={clsx(
                    "relative flex items-center justify-center w-[60px] h-[60px] bg-white transition-all duration-200 z-10",
                    "rounded-xl border",
                    selected ? "border-slate-400 shadow-[0_2px_12px_rgba(0,0,0,0.08)] scale-105" : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300",
                    isSuccess && !isRunning && "border-[#4fcc5d]/50 bg-[#4fcc5d]/5",
                    isRunning && "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-blue-50/10",
                    isError && "border-rose-500 bg-rose-50/10",
                    isDisabled && "opacity-60 grayscale bg-gray-50"
                )}
            >
                {/* Border Flow & Revolving Dot for Running state */}
                {isRunning && (
                    <>
                        <div className="n8n-node-running-border rounded-xl" />
                        <div className="n8n-node-dot" />
                    </>
                )}

                {/* Icon Container (Inner) */}
                <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
                    {data.imagePreview ? (
                        <img
                            src={data.imagePreview as string}
                            alt="Node Preview"
                            className="w-full h-full object-contain p-[6px] rounded-lg"
                            loading="lazy"
                            draggable={false}
                        />
                    ) : (
                        <div className={clsx(
                            "transition-colors",
                            isSuccess ? "text-emerald-500" : isError ? "text-rose-500" : isRunning ? "text-blue-500" : "text-[#475569]"
                        )}>
                            {IconComp ? <IconComp size={26} strokeWidth={1.5} /> : <div className="text-[10px] font-bold">Node</div>}
                        </div>
                    )}
                </div>

                {/* Trigger Lightning Indicator */}
                {isTrigger && (
                    <div className="absolute -top-1.5 -left-1.5 z-20 bg-amber-50 rounded-full border border-amber-200 p-0.5 shadow-sm text-yellow-600">
                        <Zap size={10} fill="currentColor" />
                    </div>
                )}

                {/* Status Badges Overlay (Bottom Right of the box) */}
                <div className="absolute -bottom-1.5 -right-1.5 z-30 flex">
                    {isRunning && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm border border-white">
                            <Loader2 size={10} strokeWidth={3} className="text-white animate-spin" />
                        </div>
                    )}
                    {isError && !isRunning && (
                        <div className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center shadow-sm border border-white">
                            <span className="text-white text-[10px] font-black leading-none mt-px">!</span>
                        </div>
                    )}
                </div>

                {/* Warning Indicator (Top-Right Corner of the box) */}
                {isWarning && !isRunning && !isError && (
                    <div className="absolute -top-1.5 -right-1.5 z-20 bg-white rounded-full border border-gray-200 p-0.5 shadow-sm text-yellow-500" title="Configuration Warning">
                        <AlertTriangle size={11} fill="currentColor" className="text-white stroke-yellow-500" />
                    </div>
                )}

                {/* Input Handle (Left Edge) */}
                {!isTrigger && (
                    <div className="absolute left-0 top-1/2 -translate-x-[3px] -translate-y-1/2 w-1.5 h-1.5 bg-slate-300 rounded-full z-20 flex items-center justify-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            isConnectableStart={false}
                            className="!opacity-0 !border-0 !rounded-none"
                            style={{ top: '50%', left: '-3px', transform: 'translateY(-50%)', width: 2, height: 2 }}
                        />
                    </div>
                )}

                {/* Output Handles (Right Edge) */}
                {(() => {
                    const config = def?.handleConfig;
                    let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                    if (type === 'switch') {
                        const cases = (data as any).config?.cases;
                        if (Array.isArray(cases)) {
                            const caseHandles = cases.map((caseVal: string, i: number) => ({
                                id: `${i}`,
                                label: caseVal || `Case ${i}`
                            }));
                            sources = [...caseHandles, { id: 'default', label: 'Default' }];
                        } else {
                            sources = [{ id: 'default', label: 'Default' }];
                        }
                    }

                    return sources.map((source: any, index: number) => (
                        <N8nOutputHandle
                            key={source.id}
                            source={source}
                            nodeId={id}
                            index={index}
                            total={sources.length}
                        />
                    ));
                })()}
            </div>

            {/* 2. Text Area (Below the box) */}
            <div className="flex flex-col items-center mt-2.5 w-full px-1">
                <span className="text-[13px] font-medium text-slate-700 tracking-normal w-full text-center">
                    {(data.label as string) || def?.label || 'Node'}
                </span>

                {((data.subtitle as string) || def?.description) && (
                    <span className="text-[11px] text-slate-400 font-normal w-full pt-0.5 text-center leading-tight whitespace-normal break-words" title={typeof ((data.subtitle as string) || def?.description) === 'string' ? ((data.subtitle as string) || def?.description) : ''}>
                        {(() => {
                            const sub = (data.subtitle as string) || def?.description || nodeType;
                            if (typeof sub === 'object') return JSON.stringify(sub);
                            return sub;
                        })()}
                    </span>
                )}
            </div>






            {/* 3. Floating Toolbar (Above Node) */}
            <div className={clsx(
                "absolute -top-[18px] left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-0.5 rounded-lg transition-all duration-200 z-50 pointer-events-auto",
                (hovered || selected) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-95 pointer-events-none"
            )}>
                <button
                    className={clsx(
                        "p-1 rounded-full hover:bg-gray-200/60 transition-colors",
                        isDisabled ? "text-red-400 hover:text-red-500" : "text-gray-400 hover:text-primary"
                    )}
                    title={isDisabled ? "Enable Step" : "Disable Step"}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-toggle', { detail: { nodeId: id, disabled: !isDisabled } }));
                    }}
                >
                    {isDisabled ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <button
                    className="p-1 rounded-full hover:bg-red-100/60 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete Step"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-delete', { detail: { nodeId: id } }));
                    }}
                >
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
};
