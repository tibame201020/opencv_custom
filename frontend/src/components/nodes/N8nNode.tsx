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
            // The handle component might be a wrapper, ensuring we hit the actual handle div
            const handleEl = handleRef.current.querySelector('.react-flow__handle') || handleRef.current;
            handleEl.dispatchEvent(event);
        }
    };

    const onStubMouseUp = (e: React.MouseEvent) => {
        // Manual Click Detection
        // If the mouse was released quickly and hasn't moved much, treat it as a click.
        // This is necessary because we preventDefault on mousedown (killing native click),
        // and because a drag might have legally started (React Flow "drag") but was intended as a click.
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
                className="relative w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-300 hover:border-primary hover:scale-110 transition-all shadow-sm cursor-crosshair"
            >
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
                    className="absolute left-[8px] flex items-center pointer-events-none group-hover/stub:pointer-events-auto nodrag"
                    onMouseDown={onStubMouseDown}
                    onMouseUp={onStubMouseUp}
                >
                    {/* Connecting Line */}
                    <div className="w-4 h-[2px] bg-gray-300" />

                    {/* Plus Button */}
                    <div
                        className="w-4 h-4 bg-white border border-gray-300 rounded-[2px] flex items-center justify-center text-gray-500 shadow-sm cursor-pointer hover:border-primary hover:text-primary hover:scale-110 transition-all pointer-events-auto"
                    >
                        <Plus size={10} strokeWidth={3} />
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

    return (
        <div
            className="group relative flex flex-col items-center"
            style={{ width: '120px' }} // Outer container width slightly larger for label
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* 1. Node Box (The Interactable Area) */}
            <div
                className={clsx(
                    "relative flex items-center justify-center w-24 h-24 bg-white transition-all duration-200 z-10",
                    isTrigger ? "rounded-l-[36px] rounded-r-lg" : "rounded-lg",
                    selected ? "border-2 border-primary ring-2 ring-primary/20 shadow-md" : "border-[0.5px] border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400",
                    isRunning && "border-primary",
                    isError && "border-error",
                    isDisabled && "opacity-60 grayscale"
                )}
            >
                {/* Icon */}
                <div className={clsx(
                    "transition-transform duration-200 group-hover:scale-110",
                    `text-${(def?.color as string) || 'gray'}`
                )}>
                    {IconComp ? <IconComp size={32} strokeWidth={1.5} /> : <div className="text-[10px] font-bold">Node</div>}
                </div>

                {/* Status Indicator (Top-Right Badge) */}
                {(isRunning || isSuccess || isError) && (
                    <div className={clsx(
                        "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm z-20 border-2 border-white",
                        isSuccess && "bg-success text-white",
                        isRunning && "bg-primary text-white",
                        isError && "bg-error text-white"
                    )}>
                        {isSuccess && <Check size={10} strokeWidth={4} />}
                        {isRunning && <Loader2 size={10} className="animate-spin" />}
                        {isError && <AlertCircle size={10} strokeWidth={4} />}
                    </div>
                )}

                {/* Input Handle (Left) - Receive Only (isConnectableStart={false}) */}
                {!isTrigger && (
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-gray-300 rounded-full z-20">
                        <Handle
                            type="target"
                            position={Position.Left}
                            isConnectableStart={false} // Disable dragging FROM input
                            className="!opacity-0 !w-full !h-full !border-0"
                        />
                    </div>
                )}

                {/* Dynamic Output Handles (Right) */}
                {(() => {
                    const config = def?.handleConfig;
                    let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                    // Special handling for Switch: Add handles for cases
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

            {/* 2. External Label */}
            <div className="mt-2 flex flex-col items-center max-w-full">
                <span className={clsx(
                    "text-sm font-medium text-center truncate w-full px-1",
                    selected ? "text-primary" : "text-gray-700"
                )}>
                    {(data.label as string) || def?.label || 'Node'}
                </span>
                {(data.subtitle || def?.description) && (
                    <span className="text-[10px] text-gray-400 max-w-full truncate">
                        {(data.subtitle as string) || def?.description}
                    </span>
                )}
            </div>

            {/* 3. Floating Toolbar (Above Node) */}
            <div className={clsx(
                "absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white shadow-lg border border-gray-100 z-30 transition-all duration-200",
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
});
