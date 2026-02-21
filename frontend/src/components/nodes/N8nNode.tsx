import { memo, useState, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node, useHandleConnections, useStore } from '@xyflow/react';
import {
    Check, Loader2, AlertCircle, Play, Eye, EyeOff, Trash2, MoreHorizontal, Plus
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
                    "relative w-3 h-3 rounded-full bg-white border border-gray-300 hover:border-primary hover:scale-110 transition-all shadow-sm cursor-crosshair flex items-center justify-center",
                    isConnected && "bg-gray-400 border-gray-400"
                )}
            >
                 {/* Inner dot for unconnected state */}
                 {!isConnected && <div className="w-1 h-1 bg-gray-400 rounded-full" />}

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
                    <div className="w-3 h-[2px] bg-gray-300" />

                    {/* Plus Button */}
                    <div
                        className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-500 shadow-sm cursor-pointer hover:border-primary hover:text-primary hover:scale-110 transition-all pointer-events-auto"
                    >
                        <Plus size={12} strokeWidth={3} />
                    </div>
                </div>
            )}

            {/* Label (Outside Handle to keep it non-draggable/clean) */}
            {source.label && total > 1 && (
                <div className={clsx(
                    "absolute right-full mr-5 pointer-events-none whitespace-nowrap text-[10px] font-medium px-1 py-0.5 rounded transition-opacity z-20",
                    (type === 'if_condition' || type === 'switch')
                        ? "text-gray-400 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm"
                        : "bg-gray-800 text-white shadow-md opacity-0 group-hover/stub:opacity-100"
                )}>
                    {source.label}
                </div>
            )}
        </div>
    );
};

export const N8nNode = memo(({ data, id, type, selected }: NodeProps<Node>) => {
    const nodeType = (type || (data.nodeType as string) || 'click');
    const def = getNodeDef(nodeType);
    const IconComp = def?.icon;
    const [hovered, setHovered] = useState(false);

    // Status Logic
    const isRunning = data.status === 'running';
    const isSuccess = data.status === 'success';
    const isError = data.status === 'error';
    const isDisabled = !!data.disabled;

    const isTrigger = def?.group === 'Trigger' || type === 'manual_trigger';

    // Dimensions: Triggers are often smaller/icon-based, but actions are cards.
    // For n8n look, standard actions are rectangular cards.
    // Let's implement the standard Card view.

    return (
        <div
            className="group relative flex flex-col"
            // Ensure width is sufficient for card layout
            style={{ width: '200px' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* 1. Node Card (The Interactable Area) */}
            <div
                className={clsx(
                    "relative flex flex-row items-center w-full h-[72px] bg-white transition-all duration-200 z-10 px-3 py-2",
                    "rounded-[8px] border", // Slightly smaller radius for cards
                    selected ? "border-primary ring-1 ring-primary shadow-md" : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300",
                    isRunning && "border-primary shadow-[0_0_0_2px_rgba(255,109,90,0.1)]",
                    isError && "border-error",
                    isDisabled && "opacity-60 grayscale"
                )}
            >
                {/* Icon Section (Left) */}
                <div className={clsx(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors",
                     // Use subtle background color derived from node type/color if possible, or gray-50
                     "bg-gray-50 text-gray-600"
                )}>
                    {data.imagePreview ? (
                        <img
                            src={data.imagePreview as string}
                            alt="Node Preview"
                            className="w-full h-full object-contain rounded-lg"
                            loading="lazy"
                            draggable={false}
                        />
                    ) : (
                        IconComp ? <IconComp size={20} strokeWidth={1.5} /> : <div className="text-[8px] font-bold">Node</div>
                    )}
                </div>

                {/* Text Section (Right/Middle) */}
                <div className="flex-1 flex flex-col min-w-0 justify-center">
                     <span className={clsx(
                        "text-[13px] font-semibold truncate leading-tight",
                        selected ? "text-primary" : "text-gray-800"
                    )}>
                        {(data.label as string) || def?.label || 'Node'}
                    </span>
                    <span className="text-[10px] text-gray-500 truncate mt-0.5">
                         {(data.subtitle as string) || def?.description || nodeType}
                    </span>
                </div>

                {/* Status Indicator (Top-Right absolute within card) */}
                {(isRunning || isSuccess || isError) && (
                    <div className={clsx(
                        "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-20 border border-white",
                        isSuccess && "bg-success text-white",
                        isRunning && "bg-primary text-white",
                        isError && "bg-error text-white"
                    )}>
                        {isSuccess && <Check size={10} strokeWidth={4} />}
                        {isRunning && <Loader2 size={10} className="animate-spin" />}
                        {isError && <AlertCircle size={10} strokeWidth={4} />}
                    </div>
                )}

                {/* Input Handle (Left Edge) */}
                {!isTrigger && (
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-gray-300 rounded-full z-20 shadow-sm flex items-center justify-center">
                         <div className="w-1 h-1 bg-gray-400 rounded-full" />
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

            {/* 3. Floating Toolbar (Above Node) - Keep existing logic */}
            <div className={clsx(
                "absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white shadow-lg border border-gray-100 z-30 transition-all duration-200",
                (hovered || selected) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
            )}>
                <button
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                    title="Execute Step"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-execute', { detail: { nodeId: id } }));
                    }}
                >
                    <Play size={12} fill="currentColor" />
                </button>
                <button
                    className={clsx(
                        "p-1 rounded-full hover:bg-gray-100 transition-colors",
                        isDisabled ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-primary"
                    )}
                    title={isDisabled ? "Enable Step" : "Disable Step"}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-toggle', { detail: { nodeId: id, disabled: !isDisabled } }));
                    }}
                >
                    {isDisabled ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                    className="p-1 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete Step"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('workflow-node-delete', { detail: { nodeId: id } }));
                    }}
                >
                    <Trash2 size={12} />
                </button>
                <div className="w-px h-3 bg-gray-200 mx-0.5" />
                <button
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
                    title="More Actions"
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        window.dispatchEvent(new CustomEvent('workflow-context-menu', {
                            detail: { type: 'node', x: rect.right, y: rect.bottom, id, data }
                        }));
                    }}
                >
                    <MoreHorizontal size={12} />
                </button>
            </div>
        </div>
    );
});
