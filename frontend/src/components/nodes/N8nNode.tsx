import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
    Check, Loader2, AlertCircle, Play, Eye, EyeOff, Trash2, MoreHorizontal, Plus
} from 'lucide-react';
import clsx from 'clsx';
import { getNodeDef } from '../../workflow/nodeRegistry';

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

    return (
        <div
            className="group relative flex flex-col w-48"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Main Card Container */}
            <div
                className={clsx(
                    "relative flex flex-col bg-white rounded-lg shadow-sm border transition-all duration-200 z-10 overflow-visible",
                    selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-gray-200 hover:border-gray-300",
                    isRunning && "n8n-node-running border-primary",
                    isError && "border-error",
                    isDisabled && "opacity-60 grayscale"
                )}
            >
                {/* Header Section */}
                <div className="flex items-center p-3 gap-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
                    {/* Icon Box */}
                    <div className={clsx(
                        "w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
                        `bg-${(def?.color as string) || 'gray'}-100 text-${(def?.color as string) || 'gray'}-600`
                    )}>
                        {IconComp ? <IconComp size={18} /> : <div className="text-[10px] font-bold">Node</div>}
                    </div>

                    {/* Title & Subtitle */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className={clsx(
                            "text-xs font-bold truncate leading-tight transition-colors duration-200",
                            selected ? "text-primary" : "text-gray-900"
                        )}>
                            {(data.label as string) || def?.label || 'Node'}
                        </div>
                        {(data.subtitle || def?.description) && (
                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                {(data.subtitle as string) || def?.description}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Indicator (Top-Right Badge) */}
                {(isRunning || isSuccess || isError) && (
                    <div className={clsx(
                        "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-300 z-20 border-2 border-white",
                        isSuccess && "bg-success text-white",
                        isRunning && "bg-primary text-white",
                        isError && "bg-error text-white"
                    )}>
                        {isSuccess && <Check size={10} strokeWidth={4} />}
                        {isRunning && <Loader2 size={10} className="animate-spin" />}
                        {isError && <AlertCircle size={10} strokeWidth={4} />}
                    </div>
                )}
            </div>

            {/* Floating Toolbar (Above Node) */}
            <div className={clsx(
                "absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white shadow-xl border border-gray-100 z-30 transition-all duration-200",
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

            {/* Input Handle (Left) */}
            {def?.type !== 'trigger' && ( // Assuming 'trigger' type doesn't have input, adjust as needed
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3.5 !h-3.5 !border-2 !border-gray-300 !bg-white hover:!border-primary hover:!bg-white transition-colors shadow-sm -ml-2 z-0"
                />
            )}

            {/* Dynamic Output Handles (Right) */}
            {(() => {
                const config = def?.handleConfig;
                let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                // Special handling for Switch: Add handles for cases
                if (type === 'switch') {
                    // Try to parse config.cases
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

                return sources.map((source: any, index: number) => {
                    // Distribute handles vertically on the right
                    // For single output, center it (50%). For multiple, spread them.
                    const top = sources.length === 1 ? '50%' : `${((index + 1) * 100) / (sources.length + 1)}%`;

                    return (
                        <div
                            key={source.id}
                            className="absolute right-0 flex items-center group/stub pointer-events-auto"
                            style={{ top, transform: 'translate(50%, -50%)', zIndex: 10 }}
                        >
                            {/* The Handle Dot */}
                            <div
                                className="relative w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-300 hover:border-primary hover:scale-110 transition-all shadow-sm cursor-crosshair"
                            >
                                {/* Invisible React Flow Handle on top for dragging */}
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={source.id}
                                    className="!opacity-0 !absolute !inset-0 !w-full !h-full !border-0 cursor-crosshair"
                                />
                            </div>

                            {/* Floating "+" Button on Hover (n8n style stub) - positioned to the right of handle */}
                            <div
                                className="absolute left-full ml-2 opacity-0 group-hover/stub:opacity-100 transition-all duration-200 translate-x-[-5px] group-hover/stub:translate-x-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('workflow-quick-add', {
                                        detail: { x: 0, y: 0, sourceNodeId: id, sourceHandleId: source.id }
                                    }));
                                }}
                            >
                                <div className="w-5 h-5 rounded-full bg-white border border-primary text-primary flex items-center justify-center shadow-md hover:bg-primary hover:text-white cursor-pointer transition-colors">
                                    <Plus size={12} strokeWidth={3} />
                                </div>
                            </div>

                            {/* Label (Always visible for Switch/If, else Hover) */}
                            {source.label && sources.length > 1 && (
                                <div className={clsx(
                                    "absolute right-full mr-3 pointer-events-none whitespace-nowrap text-[10px] font-medium px-1 py-0.5 rounded transition-opacity z-20",
                                    (type === 'if_condition' || type === 'switch')
                                        ? "text-gray-400 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm"
                                        : "bg-gray-800 text-white shadow-md opacity-0 group-hover/stub:opacity-100"
                                )}>
                                    {source.label}
                                </div>
                            )}
                        </div>
                    );
                });
            })()}
        </div>
    );
});
