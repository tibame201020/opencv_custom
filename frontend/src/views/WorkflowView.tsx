import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    useReactFlow,
    ReactFlowProvider,
    type Connection,
    type Edge,
    type Node,
    type OnConnectEnd,
    type OnConnectStart,
    Handle,
    Position,
    NodeResizer,
    type NodeProps,
    getSmoothStepPath,
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Editor from '@monaco-editor/react';
import { useAppStore, type WorkflowTab } from '../store';
import {
    Trash2, ChevronDown, X, GripVertical, Plus,
    Braces, ToggleLeft, Play, Maximize,
    Focus, Minus, Check, Loader2, AlertCircle, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import {
    getNodeDef, getNodesByCategory, getDefaultConfig,
    CATEGORY_LABELS, CATEGORY_COLORS,
    type NodeCategory, type ParamSchema
} from '../workflow/nodeRegistry';

/* ============================================================
 *  Generic Node Component (driven by NodeRegistry)
 * ============================================================ */
const RESIZER_LINE_STYLE = { borderWidth: 0 };
const PAN_ON_DRAG = [2];
const DEFAULT_EDGE_OPTIONS = {
    type: 'hover' as const,
    animated: true,
    style: { strokeWidth: 3, stroke: '#94a3b8' },
    interactionWidth: 20
};

/* ============================================================
 *  n8n-Style Hover Edge with Midpoint Toolbar
 * ============================================================ */
const HoverEdge: React.FC<EdgeProps> = (props) => {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected } = props;
    const [hovered, setHovered] = useState(false);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 16,
    });

    return (
        <>
            {/* Invisible wide path for easier hover */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={28}
                stroke="transparent"
                className="react-flow__edge-interaction"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            />
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: (hovered || selected) ? 4 : 3,
                    stroke: (hovered || selected) ? 'oklch(var(--p))' : (style?.stroke || '#94a3b8'),
                    transition: 'stroke 0.15s, stroke-width 0.15s',
                }}
            />
            <EdgeLabelRenderer>
                <div
                    className={clsx(
                        "absolute flex items-center gap-1 px-1 py-0.5 rounded-lg bg-base-100 border border-base-300 shadow-lg transition-all duration-150 pointer-events-auto",
                        (hovered || selected) ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                    )}
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    <button
                        className="btn btn-xs btn-ghost btn-circle hover:btn-primary hover:text-primary-content transition-colors"
                        title="Insert node"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('workflow-edge-insert', {
                                detail: { edgeId: id, x: labelX, y: labelY }
                            }));
                        }}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        className="btn btn-xs btn-ghost btn-circle hover:btn-error hover:text-error-content transition-colors"
                        title="Delete connection"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('workflow-edge-delete', {
                                detail: { edgeId: id }
                            }));
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

const edgeTypes = {
    hover: HoverEdge,
};

const GenericNode = React.memo(({ data, id, type, selected }: NodeProps<any>) => {
    const def = getNodeDef(type || data.nodeType || 'click');
    const IconComp = def?.icon;
    const borderColor = selected ? 'border-primary' : 'border-base-300';

    // Status Logic
    const isRunning = data.status === 'running';
    const isSuccess = data.status === 'success';
    const isError = data.status === 'error';

    return (
        <div className={clsx(
            "group relative bg-base-100 rounded-xl border-2 transition-all duration-300 shadow-sm hover:shadow-md",
            borderColor,
            isRunning && "n8n-node-running ring-4 ring-primary/20",
            "n8n-node-pop" // Pop-in animation on mount
        )}>
            {selected && (
                <NodeResizer
                    minWidth={160}
                    minHeight={80}
                    lineStyle={RESIZER_LINE_STYLE}
                    handleClassName="w-2 h-2 bg-primary border-none rounded-full"
                />
            )}

            {/* n8n Style Status Indicator (Top-Right) */}
            {(isRunning || isSuccess || isError) && (
                <div className={clsx(
                    "absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-base-100 z-20 animate-in zoom-in duration-300",
                    isSuccess && "bg-success text-white",
                    isRunning && "bg-primary text-white",
                    isError && "bg-error text-white"
                )}>
                    {isSuccess && <Check size={14} strokeWidth={3} />}
                    {isRunning && <Loader2 size={14} className="animate-spin" />}
                    {isError && <AlertCircle size={14} strokeWidth={3} />}
                </div>
            )}

            <div className="flex items-center gap-3 p-3 min-w-[160px]">
                {/* Node Icon - n8n style rounded box */}
                <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform",
                    `bg-${def?.color || 'base-200'} text-white`
                )}>
                    {IconComp ? <IconComp size={20} /> : <div className="text-[10px] font-bold">Node</div>}
                </div>

                <div className="min-w-0 pr-4">
                    <div className="text-xs font-bold truncate leading-tight">{data.label || def?.label || 'Node'}</div>
                    <div className="text-[9px] opacity-40 truncate">{data.subtitle || def?.description}</div>
                </div>
                <div className="ml-auto opacity-10 group-hover:opacity-30 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} />
                </div>
            </div>

            {/* Input Handle (Left) */}
            {def?.type !== 'click' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3 h-3 border-2 border-base-100 bg-base-300 rounded-full hover:bg-primary transition-colors"
                />
            )}

            {/* Dynamic Output Handles */}
            {(() => {
                const config = def?.handleConfig;
                let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                // Special handling for Switch: Add handles for cases
                if (type === 'switch') {
                    // Try to parse config.cases
                    const caseStr = data.config?.cases;
                    try {
                        const cases = typeof caseStr === 'string' ? JSON.parse(caseStr) : caseStr;
                        if (Array.isArray(cases)) {
                            const caseHandles = cases.map((c, i) => ({
                                id: `${i}`,
                                label: `Case ${i} (${c})`
                            }));
                            sources = [...caseHandles, { id: 'default', label: 'Default' }];
                        }
                    } catch { }
                }

                return sources.map((source, index) => {
                    // Distribute handles vertically on the right
                    const top = sources.length === 1 ? '50%' : `${((index + 1) * 100) / (sources.length + 1)}%`;
                    // Color logic
                    let bg = 'bg-success';
                    if (source.id === 'false' || source.id === 'default') bg = 'bg-base-content/20'; // Grey/False
                    if (type === 'switch') bg = 'bg-accent';

                    return (
                        <div key={source.id} className="absolute right-0" style={{ top, transform: 'translate(50%, -50%)' }}>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={source.id}
                                className={clsx("w-3 h-3 border-2 border-base-100 rounded-full hover:scale-125 transition-transform", bg)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    window.dispatchEvent(new CustomEvent('workflow-quick-add', {
                                        detail: { x: rect.right + 20, y: rect.top - 150, sourceNodeId: id, sourceHandleId: source.id }
                                    }));
                                }}
                            />
                            {/* Hover Label */}
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap text-[9px] font-bold bg-base-100 px-1 rounded shadow-sm transition-opacity z-10">
                                {source.label}
                            </div>
                        </div>
                    );
                });
            })()}
        </div>
    );
});

const nodeTypes = {
    click: GenericNode,
    find: GenericNode,
    text: GenericNode,
    wait: GenericNode,
    loop: GenericNode,
    condition: GenericNode,
    script: GenericNode,
};

/* ============================================================
 *  Context Menu Component (n8n Style)
 * ============================================================ */
interface GraphContextMenuProps {
    type: 'node' | 'edge' | 'pane';
    x: number;
    y: number;
    onClose: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onToFront?: () => void;
    onToBack?: () => void;
    onProperties?: () => void;
}

const GraphContextMenu: React.FC<GraphContextMenuProps> = ({
    type, x, y, onClose, onDelete, onDuplicate, onToFront, onToBack, onProperties
}) => {
    return (
        <div
            className="fixed bg-base-100 border border-base-300 shadow-2xl rounded-xl py-1.5 z-[100] min-w-[170px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            <div className="px-3 py-1 text-[9px] font-bold opacity-30 uppercase tracking-widest">{type} Actions</div>

            {onProperties && (
                <button onClick={onProperties} className="w-full text-left px-4 py-2 hover:bg-base-200 text-xs flex items-center gap-2">
                    <Braces size={14} className="text-primary" /> Edit Node
                </button>
            )}

            {onDuplicate && (
                <button onClick={onDuplicate} className="w-full text-left px-4 py-2 hover:bg-base-200 text-xs flex items-center gap-2">
                    <Plus size={14} className="text-success" /> Duplicate Node
                </button>
            )}

            {(onToFront || onToBack) && <div className="divider my-0 opacity-20" />}

            {onToFront && (
                <button onClick={onToFront} className="w-full text-left px-4 py-2 hover:bg-base-200 text-xs flex items-center gap-2">
                    <ChevronDown size={14} className="rotate-180" /> Bring to Front
                </button>
            )}

            {onToBack && (
                <button onClick={onToBack} className="w-full text-left px-4 py-2 hover:bg-base-200 text-xs flex items-center gap-2">
                    <ChevronDown size={14} /> Send to Back
                </button>
            )}

            {(onDelete) && <div className="divider my-0 opacity-20" />}

            {onDelete && (
                <button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-error/10 text-error text-xs flex items-center gap-2">
                    <Trash2 size={14} /> Delete
                </button>
            )}
        </div>
    );
};

/* ============================================================
 *  n8n Style Quick Add Menu
 * ============================================================ */
interface QuickAddMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAdd: (type: string) => void;
}

const QuickAddMenu: React.FC<QuickAddMenuProps> = ({ x, y, onClose, onAdd }) => {
    const categories = getNodesByCategory();
    const [search, setSearch] = useState('');

    return (
        <div
            className="fixed bg-base-100 border border-base-300 shadow-2xl rounded-2xl p-3 z-[100] w-64 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            style={{ left: x, top: y }}
        >
            <div className="relative mb-3">
                <input
                    autoFocus
                    type="text"
                    placeholder="Search nodes..."
                    className="input input-sm input-bordered w-full pr-8 rounded-lg outline-none focus:border-primary/50 transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 items-center">
                    <kbd className="kbd kbd-xs opacity-20 font-sans">Esc</kbd>
                </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-4">
                {(Object.keys(categories) as NodeCategory[]).map(cat => (
                    <div key={cat}>
                        <div className={clsx("text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1.5 px-1", CATEGORY_COLORS[cat])}>
                            {CATEGORY_LABELS[cat]}
                        </div>
                        <div className="space-y-0.5">
                            {categories[cat].filter(d => d.label.toLowerCase().includes(search.toLowerCase())).map(def => {
                                const IconComp = def.icon;
                                return (
                                    <button
                                        key={def.type}
                                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-all text-left group"
                                        onClick={() => onAdd(def.type)}
                                    >
                                        <div className={clsx("p-1.5 rounded-md bg-base-200 group-hover:bg-primary/10 transition-colors", `text-${def.color}`)}>
                                            <IconComp size={14} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold leading-none">{def.label}</div>
                                            <div className="text-[9px] opacity-40 mt-1 line-clamp-1">{def.description}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="absolute top-0 right-0 p-2">
                <button onClick={onClose} className="btn btn-xs btn-ghost btn-square opacity-20 hover:opacity-100">
                    <X size={12} />
                </button>
            </div>
        </div>
    );
};

/* ============================================================
 *  n8n-Style Full-Screen Node Settings Modal
 * ============================================================ */
interface NodeSettingsModalProps {
    node: Node;
    nodeDef: ReturnType<typeof getNodeDef>;
    onClose: () => void;
    onConfigChange: (key: string, value: any) => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
    expressionModes: Record<string, boolean>;
    onToggleExpression: (key: string) => void;
}

const NodeSettingsModal: React.FC<NodeSettingsModalProps> = ({
    node, nodeDef, onClose, onConfigChange, onRename, onDelete,
    expressionModes, onToggleExpression
}) => {
    const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempName, setTempName] = useState((node.data as any).label || '');

    if (!nodeDef) return null;

    const IconComp = nodeDef.icon;

    return (
        <div className="fixed inset-0 z-[200] flex items-stretch bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="flex-1 flex flex-col bg-base-100 m-4 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-300 bg-base-200/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg bg-base-300", `text-${nodeDef.color}`)}>
                            <IconComp size={20} />
                        </div>
                        {isRenaming ? (
                            <input
                                autoFocus
                                className="input input-sm input-bordered font-bold"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={() => { onRename(tempName); setIsRenaming(false); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { onRename(tempName); setIsRenaming(false); } if (e.key === 'Escape') setIsRenaming(false); }}
                            />
                        ) : (
                            <span
                                className="text-base font-bold cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setIsRenaming(true)}
                                title="Click to rename"
                            >
                                {(node.data as any).label || nodeDef.label}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-sm btn-error gap-2 rounded-lg">
                            <Zap size={14} /> Execute step
                        </button>
                        <button onClick={onClose} className="btn btn-sm btn-ghost btn-square">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body — 3 columns */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: INPUT */}
                    <div className="w-64 border-r border-base-300 flex flex-col shrink-0 bg-base-200/30">
                        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest opacity-40 border-b border-base-300">
                            Input
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-4 text-center">
                            <div className="text-xs">No input data</div>
                            <div className="text-[10px] mt-1 opacity-60">Connect an input node</div>
                        </div>
                    </div>

                    {/* Center: Parameters / Settings */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex border-b border-base-300 shrink-0">
                            <button
                                className={clsx(
                                    "px-5 py-2.5 text-xs font-bold transition-colors",
                                    activeTab === 'parameters' ? "text-primary border-b-2 border-primary" : "text-base-content/40 hover:text-base-content/70"
                                )}
                                onClick={() => setActiveTab('parameters')}
                            >
                                Parameters
                            </button>
                            <button
                                className={clsx(
                                    "px-5 py-2.5 text-xs font-bold transition-colors",
                                    activeTab === 'settings' ? "text-primary border-b-2 border-primary" : "text-base-content/40 hover:text-base-content/70"
                                )}
                                onClick={() => setActiveTab('settings')}
                            >
                                Settings
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {activeTab === 'parameters' ? (
                                <div className="max-w-xl mx-auto space-y-4">
                                    {/* Node Name */}
                                    <div className="form-control w-full">
                                        <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Name</span></label>
                                        <input
                                            type="text"
                                            className="input input-bordered"
                                            value={(node.data as any).label}
                                            onChange={(e) => onRename(e.target.value)}
                                        />
                                    </div>

                                    {nodeDef.params.length > 0 && (
                                        <div className="divider text-xs opacity-30 uppercase tracking-widest">Parameters</div>
                                    )}

                                    {nodeDef.params.map(param => (
                                        <ParamField
                                            key={param.key}
                                            param={param}
                                            value={(node.data as any).config?.[param.key]}
                                            onChange={onConfigChange}
                                            expressionMode={!!expressionModes[`${node.id}:${param.key}`]}
                                            onToggleExpression={() => onToggleExpression(`${node.id}:${param.key}`)}
                                        />
                                    ))}

                                    {/* Delete */}
                                    <div className="pt-4 border-t border-base-300">
                                        <button className="btn btn-sm btn-error btn-outline gap-2 w-full" onClick={onDelete}>
                                            <Trash2 size={14} /> Delete Node
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-xl mx-auto space-y-4">
                                    <div className="form-control w-full">
                                        <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Node ID</span></label>
                                        <input type="text" value={node.id} readOnly className="input input-bordered font-mono text-xs opacity-40 bg-base-200" />
                                    </div>
                                    <div className="form-control w-full">
                                        <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Type</span></label>
                                        <input type="text" value={nodeDef.type} readOnly className="input input-bordered font-mono text-xs opacity-40 bg-base-200" />
                                    </div>
                                    <div className="form-control w-full">
                                        <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Category</span></label>
                                        <input type="text" value={nodeDef.category} readOnly className="input input-bordered text-xs opacity-40 bg-base-200" />
                                    </div>
                                    <div className="text-[10px] opacity-30 mt-6">
                                        {nodeDef.description}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: OUTPUT */}
                    <div className="w-64 border-l border-base-300 flex flex-col shrink-0 bg-base-200/30">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Output</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-4 text-center">
                            <div className="text-xs">No output data</div>
                            <div className="text-[10px] mt-1 opacity-60">Execute step to view output</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
 *  Typed Properties Panel Components
 * ============================================================ */
interface ParamFieldProps {
    param: ParamSchema;
    value: any;
    onChange: (key: string, value: any) => void;
    expressionMode: boolean;
    onToggleExpression: () => void;
}

const ParamField: React.FC<ParamFieldProps> = ({
    param, value, onChange, expressionMode, onToggleExpression
}) => {
    const { theme } = useAppStore();

    if (expressionMode) {
        return (
            <div className="form-control w-full">
                <label className="label py-1">
                    <span className="text-[10px] uppercase font-bold opacity-50">{param.label}</span>
                    <button
                        className="btn btn-xs btn-ghost gap-1 text-warning"
                        onClick={onToggleExpression}
                        title="Switch to Fixed value"
                    >
                        <Braces size={10} /> Expr
                    </button>
                </label>
                <input
                    type="text"
                    className="input input-xs input-bordered font-mono text-warning bg-warning/5 border-warning/30"
                    value={value || ''}
                    onChange={(e) => onChange(param.key, e.target.value)}
                    placeholder={param.placeholder || '{{ $nodes["..."].output.xxx }}'}
                />
                {param.description && <div className="text-[9px] opacity-30 mt-0.5 pl-1">{param.description}</div>}
            </div>
        );
    }

    const commonLabel = (
        <label className="label py-1">
            <span className="text-[10px] uppercase font-bold opacity-50">
                {param.label} {param.required && <span className="text-error">*</span>}
            </span>
            <button
                className="btn btn-xs btn-ghost gap-1 opacity-30 hover:opacity-100"
                onClick={onToggleExpression}
                title="Switch to Expression"
            >
                <ToggleLeft size={10} />
            </button>
        </label>
    );

    switch (param.type) {
        case 'int':
        case 'float':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <input
                        type="number"
                        className="input input-xs input-bordered"
                        value={value ?? param.defaultValue ?? ''}
                        onChange={(e) => onChange(param.key, param.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                        min={param.min}
                        max={param.max}
                        step={param.type === 'float' ? 0.1 : 1}
                    />
                </div>
            );

        case 'string':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <input
                        type="text"
                        className="input input-xs input-bordered"
                        value={value ?? ''}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                    />
                </div>
            );

        case 'boolean':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <input
                        type="checkbox"
                        className="toggle toggle-xs toggle-primary"
                        checked={!!value}
                        onChange={(e) => onChange(param.key, e.target.checked)}
                    />
                </div>
            );

        case 'select':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <select
                        className="select select-xs select-bordered"
                        value={value ?? param.defaultValue ?? ''}
                        onChange={(e) => onChange(param.key, e.target.value)}
                    >
                        <option value="" disabled>Select...</option>
                        {param.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );

        case 'asset':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="input input-xs input-bordered flex-1 font-mono"
                            value={value ?? ''}
                            onChange={(e) => onChange(param.key, e.target.value)}
                            placeholder="images/button.png"
                        />
                    </div>
                    {param.description && <div className="text-[9px] opacity-30 mt-0.5 pl-1">{param.description}</div>}
                </div>
            );

        case 'region':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <div className="grid grid-cols-2 gap-1">
                        <input type="number" className="input input-xs input-bordered" placeholder="x1" value={value?.x1 ?? ''} onChange={(e) => onChange(param.key, { ...value, x1: parseInt(e.target.value) })} />
                        <input type="number" className="input input-xs input-bordered" placeholder="y1" value={value?.y1 ?? ''} onChange={(e) => onChange(param.key, { ...value, y1: parseInt(e.target.value) })} />
                        <input type="number" className="input input-xs input-bordered" placeholder="x2" value={value?.x2 ?? ''} onChange={(e) => onChange(param.key, { ...value, x2: parseInt(e.target.value) })} />
                        <input type="number" className="input input-xs input-bordered" placeholder="y2" value={value?.y2 ?? ''} onChange={(e) => onChange(param.key, { ...value, y2: parseInt(e.target.value) })} />
                    </div>
                    <div className="text-[9px] opacity-30 mt-0.5 pl-1">x1, y1 (top-left) → x2, y2 (bottom-right)</div>
                </div>
            );

        case 'expression':
            return (
                <div className="form-control w-full">
                    <label className="label py-1">
                        <span className="text-[10px] uppercase font-bold opacity-50">
                            {param.label} {param.required && <span className="text-error">*</span>}
                        </span>
                    </label>
                    <input
                        type="text"
                        className="input input-xs input-bordered font-mono text-warning bg-warning/5 border-warning/30"
                        value={value ?? ''}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder || '{{ ... }}'}
                    />
                    {param.description && <div className="text-[9px] opacity-30 mt-0.5 pl-1">{param.description}</div>}
                </div>
            );

        case 'json':
            return (
                <div className="form-control w-full h-[200px]">
                    {commonLabel}
                    <div className="h-full border border-base-300 rounded-lg overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? '{}')}
                            onChange={(val) => onChange(param.key, val)}
                            options={{
                                minimap: { enabled: false },
                                lineNumbers: 'off',
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                fontFamily: 'monospace',
                                automaticLayout: true
                            }}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        />
                    </div>
                </div>
            );

        default:
            return null;
    }
};

/* ============================================================
 *  Props
 * ============================================================ */
interface WorkflowViewProps {
    tab: WorkflowTab;
    onContentChange?: (content: string) => void;
    onRun?: () => void;
    isExecuting?: boolean;
    executionState?: any[]; // List of executed steps
}

/* ============================================================
 *  Right Panel Tab Type
 * ============================================================ */
type RightPanelTab = 'properties' | 'variables' | 'data';

/* ============================================================
 *  Inner Component (needs ReactFlowProvider)
 * ============================================================ */
function WorkflowViewInner({ tab, onContentChange, onRun, isExecuting = false, executionState = [] }: WorkflowViewProps) {
    const { theme } = useAppStore();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const { screenToFlowPosition, zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        platform: true, vision: true, flow: true
    });
    const [expressionModes, setExpressionModes] = useState<Record<string, boolean>>({});
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Context Menu State
    const [graphContextMenu, setGraphContextMenu] = useState<{
        type: 'node' | 'edge' | 'pane';
        x: number;
        y: number;
        id?: string;
        data?: any;
    } | null>(null);

    // n8n Quick Add State
    const [quickAddMenu, setQuickAddMenu] = useState<{
        x: number;
        y: number;
        sourceNodeId?: string;
        sourceHandleId?: string;
    } | null>(null);

    // Ref to handle connection end events
    const connectingNodeId = useRef<string | null>(null);
    const connectingHandleId = useRef<string | null>(null);


    // Handle Quick Add Event from Nodes
    useEffect(() => {
        const handleQuickAdd = (e: any) => {
            setQuickAddMenu({
                x: e.detail.x,
                y: e.detail.y,
                sourceNodeId: e.detail.sourceNodeId,
                sourceHandleId: e.detail.sourceHandleId
            });
        };
        window.addEventListener('workflow-quick-add', handleQuickAdd);
        return () => window.removeEventListener('workflow-quick-add', handleQuickAdd);
    }, []);

    // Parse workflow data from tab content
    const workflowData = useMemo(() => {
        try { return JSON.parse(tab.content); } catch { return { nodes: {}, edges: [], variables: {} }; }
    }, [tab.id, tab.content]);

    // Convert backend format to React Flow format
    const initialNodes: Node[] = useMemo(() => {
        const nodesMap = workflowData.nodes || {};
        const nodeList = Object.values(nodesMap).map((n: any) => {
            const def = getNodeDef(n.type);
            let subtitle = '';
            if (n.config) {
                const entries = Object.entries(n.config).slice(0, 2);
                subtitle = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
            }

            // Check execution state
            const executedStep = executionState.find(s => s.nodeId === n.id);
            let status = undefined;
            if (executedStep) {
                status = 'success'; // Or based on signal?
                // If it's the last one and isExecuting is true, maybe running?
                // But executionState arrives as completed steps.
            } else if (isExecuting) {
                // Check if currently running? We don't have real-time "started" events yet, only "completed" steps.
                // We can infer "running" if it's connected to the last completed step?
                // For now, simpler: highlight completed nodes.
            }

            return {
                id: n.id,
                type: n.type || 'click',
                position: { x: n.x || 0, y: n.y || 0 },
                data: {
                    label: n.name || def?.label || 'Node',
                    nodeType: n.type,
                    config: n.config || {},
                    subtitle,
                    style: n.style,
                    status,
                },
            };
        });
        return nodeList;
    }, [workflowData, executionState, isExecuting]);

    const initialEdges: Edge[] = useMemo(() => {
        const edgeArr = workflowData.edges || [];
        // Map of completed nodes and their output signals
        const completedNodes = new Map<string, string>(); // NodeID -> Signal
        executionState.forEach(step => {
            completedNodes.set(step.nodeId, step.signal);
        });

        return edgeArr.map((e: any) => {
            const { stroke, strokeWidth } = e.style || {};

            // Check if this edge was traversed
            // An edge is traversed if:
            // 1. Source node was executed
            // 2. Source output signal matches edge signal (or default success)
            // 3. Target node was executed (implies flow continued)
            //    OR just source executed with matching signal implies this path was CHOSEN.

            const sourceSignal = completedNodes.get(e.fromNodeId || e.source);
            const edgeSignal = e.signal || 'success';
            // Edge sourceHandle might be 'false' or 'true'.
            // engine.go uses "true"/"false" strings for signal.

            const isTraversed = sourceSignal && (
                sourceSignal === edgeSignal ||
                (edgeSignal === 'success' && sourceSignal === 'success') // Default match
            );

            // Determine style
            let edgeColor = stroke || '#94a3b8';
            let animated = isExecuting;

            if (isTraversed) {
                edgeColor = '#22c55e'; // Green
                animated = false; // Stop animating if completed? Or keep generic animation?
            } else if (isExecuting) {
                edgeColor = '#ff6d5a'; // Active/Pending color
            }

            if (e.signal === 'false') edgeColor = '#ff52d9'; // Logic False branch base color
            if (isTraversed) edgeColor = '#22c55e'; // Traversed overrides

            return {
                id: e.id,
                source: e.fromNodeId || e.source,
                target: e.toNodeId || e.target,
                sourceHandle: e.signal && e.signal !== 'success' ? e.signal : undefined,
                label: e.signal || 'success',
                type: 'hover',
                animated: animated,
                className: isExecuting || isTraversed ? 'n8n-flow-active' : '',
                style: {
                    stroke: edgeColor,
                    strokeWidth: isTraversed ? 4 : (strokeWidth || 3)
                },
                interactionWidth: 20,
                selectable: true,
                updatable: true,
            };
        });
    }, [workflowData, isExecuting, executionState]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes/edges when props change (specifically executionState)
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Edge Toolbar Events (from HoverEdge component)
    useEffect(() => {
        const handleEdgeDelete = (e: any) => {
            setEdges(eds => eds.filter(edge => edge.id !== e.detail.edgeId));
        };
        const handleEdgeInsert = (e: any) => {
            const { edgeId } = e.detail;
            const edge = edges.find(ed => ed.id === edgeId);
            if (!edge) return;
            setQuickAddMenu({
                x: e.detail.x || 400,
                y: e.detail.y || 300,
                sourceNodeId: edge.source,
                sourceHandleId: edge.sourceHandle || undefined,
            });
            setEdges(eds => eds.filter(ed => ed.id !== edgeId));
        };
        window.addEventListener('workflow-edge-delete', handleEdgeDelete);
        window.addEventListener('workflow-edge-insert', handleEdgeInsert);
        return () => {
            window.removeEventListener('workflow-edge-delete', handleEdgeDelete);
            window.removeEventListener('workflow-edge-insert', handleEdgeInsert);
        };
    }, [edges, setEdges]);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            label: 'success',
            type: 'hover',
            animated: true,
            style: { strokeWidth: 3, stroke: '#94a3b8' },
            interactionWidth: 20,
        } as any, eds));
    }, [setEdges]);

    const onConnectStart: OnConnectStart = useCallback((_, { nodeId, handleId }) => {
        connectingNodeId.current = nodeId;
        connectingHandleId.current = handleId;
    }, []);

    const onConnectEnd: OnConnectEnd = useCallback((event) => {
        if (!connectingNodeId.current) return;
        const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');
        if (targetIsPane) {
            setQuickAddMenu({
                x: (event as MouseEvent).clientX - 100,
                y: (event as MouseEvent).clientY - 200,
                sourceNodeId: connectingNodeId.current || undefined,
                sourceHandleId: connectingHandleId.current || undefined,
            });
        }
        connectingNodeId.current = null;
        connectingHandleId.current = null;
    }, []);

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onNodeDoubleClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
        setShowSettingsModal(true);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setGraphContextMenu(null);
    }, []);

    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setSelectedNode(node);
        setGraphContextMenu({ type: 'node', x: event.clientX, y: event.clientY, id: node.id, data: node });
    }, []);

    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        setGraphContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, id: edge.id });
    }, []);

    const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
        event.preventDefault();
        setGraphContextMenu({ type: 'pane', x: event.clientX, y: event.clientY });
    }, []);

    const moveNodeToFront = useCallback(() => {
        if (!selectedNode) return;
        setNodes(nds => {
            const others = nds.filter(n => n.id !== selectedNode.id);
            const current = nds.find(n => n.id === selectedNode.id);
            return current ? [...others, current] : nds;
        });
        setGraphContextMenu(null);
    }, [selectedNode, setNodes]);

    const moveNodeToBack = useCallback(() => {
        if (!selectedNode) return;
        setNodes(nds => {
            const others = nds.filter(n => n.id !== selectedNode.id);
            const current = nds.find(n => n.id === selectedNode.id);
            return current ? [current, ...others] : nds;
        });
        setGraphContextMenu(null);
    }, [selectedNode, setNodes]);

    const handleDuplicate = useCallback(() => {
        if (selectedNode) {
            const offset = 20;
            const newNode = {
                ...selectedNode,
                id: uuidv4(),
                position: { x: selectedNode.position.x + offset, y: selectedNode.position.y + offset },
                selected: true,
                data: { ...selectedNode.data }
            };
            setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNode));
            setSelectedNode(newNode);
        }
        setGraphContextMenu(null);
    }, [selectedNode, setNodes]);

    const handleDeleteFromMenu = useCallback(() => {
        if (graphContextMenu?.id) {
            const id = graphContextMenu.id;
            if (graphContextMenu.type === 'node') {
                setNodes(nds => nds.filter(n => n.id !== id));
                setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
                if (selectedNode?.id === id) setSelectedNode(null);
            } else {
                setEdges(eds => eds.filter(e => e.id !== id));
            }
        }
        setGraphContextMenu(null);
    }, [graphContextMenu, setNodes, setEdges, selectedNode]);

    const handlePropertiesFromMenu = useCallback(() => {
        if (selectedNode) {
            setShowSettingsModal(true);
        }
        setGraphContextMenu(null);
    }, [selectedNode]);

    const addConnectedNode = useCallback((nodeType: string, x: number, y: number, sourceId?: string, handleId?: string) => {
        const def = getNodeDef(nodeType);
        const newNodeId = uuidv4();
        const newNode: Node = {
            id: newNodeId,
            type: nodeType,
            position: { x, y },
            data: { label: def?.label || 'Node', nodeType, config: {}, subtitle: '' },
        };
        setNodes((nds) => nds.concat(newNode));
        if (sourceId) {
            setEdges((eds) => addEdge({
                id: uuidv4(),
                source: sourceId,
                target: newNodeId,
                sourceHandle: handleId,
                label: handleId === 'false' ? 'false' : 'success',
                ...DEFAULT_EDGE_OPTIONS
            } as any, eds));
        }
        setQuickAddMenu(null);
    }, [setNodes, setEdges]);

    useEffect(() => {
        const nodesMap: Record<string, any> = {};
        nodes.forEach(n => {
            nodesMap[n.id] = {
                id: n.id,
                name: (n.data as any).label || '',
                type: n.type || 'click',
                config: (n.data as any).config || {},
                x: n.position.x,
                y: n.position.y,
                style: { width: n.width, height: n.height, ...n.style },
            };
        });
        const edgeArr = edges.map(e => ({
            id: e.id, fromNodeId: e.source, toNodeId: e.target,
            signal: e.sourceHandle || String(e.label || 'success'),
        }));
        const updated = { ...workflowData, nodes: nodesMap, edges: edgeArr };
        const json = JSON.stringify(updated, null, 2);
        if (json !== tab.content && onContentChange) onContentChange(json);
    }, [nodes, edges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type) return;
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const newNode: Node = {
            id: uuidv4(), type, position,
            data: { label: getNodeDef(type)?.label || 'Node', nodeType: type, config: getDefaultConfig(type), subtitle: '' },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes, screenToFlowPosition]);

    const handleConfigChange = useCallback((key: string, value: any) => {
        if (!selectedNode) return;
        const updateNode = (n: Node) => {
            if (n.id !== selectedNode.id) return n;
            const newConfig = { ...(n.data as any).config, [key]: value };
            const entries = Object.entries(newConfig).filter(([, v]) => v !== undefined && v !== '').slice(0, 2);
            const subtitle = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
            return { ...n, data: { ...n.data as any, config: newConfig, subtitle } };
        };
        setNodes(nds => nds.map(updateNode));
        setSelectedNode(prev => prev ? updateNode(prev) : null);
    }, [selectedNode, setNodes]);

    const handleRenameNode = useCallback((newName: string) => {
        if (!selectedNode) return;
        const updateNode = (n: Node) => {
            if (n.id !== selectedNode.id) return n;
            return { ...n, data: { ...n.data as any, label: newName } };
        };
        setNodes(nds => nds.map(updateNode));
        setSelectedNode(prev => prev ? updateNode(prev) : null);
    }, [selectedNode, setNodes]);

    const handleDeleteFromModal = useCallback(() => {
        if (!selectedNode) return;
        const id = selectedNode.id;
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        setSelectedNode(null);
        setShowSettingsModal(false);
    }, [selectedNode, setNodes, setEdges]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement)?.contentEditable === 'true') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
                if (selectedIds.length === 0 && selectedNode) selectedIds.push(selectedNode.id);
                setNodes(nds => nds.filter(n => !selectedIds.includes(n.id)));
                setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
                if (selectedNode && selectedIds.includes(selectedNode.id)) setSelectedNode(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [nodes, selectedNode, setNodes, setEdges]);

    const getVars = useCallback(() => {
        try { return JSON.parse(tab.content)?.variables || {}; } catch { return {}; }
    }, [tab.content]);

    const updateVars = useCallback((newVars: Record<string, string>) => {
        try {
            const data = JSON.parse(tab.content);
            data.variables = newVars;
            onContentChange?.(JSON.stringify(data, null, 2));
        } catch { }
    }, [tab.content, onContentChange]);

    const flowColorMode = useMemo(() => {
        const lightThemes = ['light', 'cupcake', 'emerald', 'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord'];
        return lightThemes.includes(theme) ? 'light' : 'dark';
    }, [theme]);

    const monacoTheme = useMemo(() => {
        const lightThemes = ['light', 'cupcake', 'emerald', 'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord'];
        return lightThemes.includes(theme) ? 'light' : 'vs-dark';
    }, [theme]);

    const nodesByCategory = useMemo(() => getNodesByCategory(), []);
    const selectedNodeDef = selectedNode ? getNodeDef(selectedNode.type || '') : null;
    const vars = getVars();
    const varEntries = Object.entries(vars);

    return (
        <div className="flex-1 flex h-full bg-base-100 overflow-hidden">
            {tab.viewMode === 'graph' ? (
                <div className="flex-1 flex relative">
                    {/* Node Palette */}
                    <div className="w-56 border-r border-base-300 bg-base-200/50 p-2 flex flex-col gap-1 shrink-0 overflow-y-auto custom-scrollbar">
                        {(Object.keys(nodesByCategory) as NodeCategory[]).map(cat => (
                            <div key={cat}>
                                <button
                                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-base-300/50 transition-colors"
                                    onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                >
                                    <ChevronDown size={12} className={clsx("transition-transform", !expandedCategories[cat] && "-rotate-90")} />
                                    <span className={clsx("text-[10px] font-bold uppercase tracking-widest", CATEGORY_COLORS[cat])}>
                                        {CATEGORY_LABELS[cat]}
                                    </span>
                                    <span className="text-[9px] opacity-30 ml-auto">{nodesByCategory[cat].length}</span>
                                </button>
                                {expandedCategories[cat] && (
                                    <div className="ml-1 space-y-0.5 mb-2">
                                        {nodesByCategory[cat].map(def => {
                                            const IconComp = def.icon;
                                            return (
                                                <div
                                                    key={def.type}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('application/reactflow', def.type);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    className="group flex items-center gap-2 bg-base-100 border border-base-300 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all"
                                                >
                                                    <GripVertical size={9} className="opacity-15 group-hover:opacity-40 shrink-0" />
                                                    <div className={clsx("p-1 rounded-md bg-base-200 group-hover:bg-primary/10 shrink-0", `text-${def.color}`)}>
                                                        <IconComp size={13} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[11px] font-bold truncate">{def.label}</div>
                                                        <div className="text-[9px] opacity-35 truncate">{def.description}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onNodeDoubleClick={onNodeDoubleClick}
                            onNodeContextMenu={onNodeContextMenu}
                            onEdgeContextMenu={onEdgeContextMenu}
                            onPaneClick={onPaneClick}
                            onPaneContextMenu={onPaneContextMenu}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            nodeTypes={nodeTypes as any}
                            edgeTypes={edgeTypes}
                            fitView
                            colorMode={flowColorMode}
                            deleteKeyCode={null}
                            selectionOnDrag={true}
                            panOnDrag={PAN_ON_DRAG}
                            panOnScroll={true}
                            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                            onConnectStart={onConnectStart}
                            onConnectEnd={onConnectEnd}
                        >
                            <Background gap={24} color="#f8fafc" />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
                                {onRun && (
                                    <button
                                        className={clsx(
                                            "btn btn-lg text-white border-none shadow-xl rounded-full px-8 gap-3 animate-in fade-in slide-in-from-bottom duration-300 group transition-all",
                                            isExecuting ? "bg-primary/50 cursor-not-allowed" : "bg-[#ff6d5a] hover:bg-[#ff5a45]"
                                        )}
                                        disabled={isExecuting}
                                        onClick={onRun}
                                    >
                                        {isExecuting ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />}
                                        <span className="font-bold tracking-tight">{isExecuting ? 'Executing...' : 'Execute workflow'}</span>
                                    </button>
                                )}
                            </div>
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10 flex flex-col gap-2 p-1.5 bg-base-100 border border-base-300 shadow-xl rounded-xl backdrop-blur-sm">
                                <button className="btn btn-sm btn-ghost btn-square text-base-content/60 hover:text-primary transition-colors" title="Zoom In" onClick={() => zoomIn()}><Plus size={18} /></button>
                                <button className="btn btn-sm btn-ghost btn-square text-base-content/60 hover:text-primary transition-colors" title="Zoom Out" onClick={() => zoomOut()}><Minus size={18} /></button>
                                <div className="h-px bg-base-300 mx-1" />
                                <button className="btn btn-sm btn-ghost btn-square text-base-content/60 hover:text-primary transition-colors" title="Zoom to Fit" onClick={() => fitView()}><Focus size={18} /></button>
                                <button className="btn btn-sm btn-ghost btn-square text-base-content/60 hover:text-primary transition-colors" title="Center View" onClick={() => zoomTo(1)}><Maximize size={16} /></button>
                            </div>
                            <Controls />
                            <MiniMap zoomable pannable />
                        </ReactFlow>

                        {graphContextMenu && (
                            <GraphContextMenu
                                type={graphContextMenu.type}
                                x={graphContextMenu.x}
                                y={graphContextMenu.y}
                                onClose={() => setGraphContextMenu(null)}
                                onDelete={handleDeleteFromMenu}
                                onDuplicate={graphContextMenu.type === 'node' ? handleDuplicate : undefined}
                                onToFront={graphContextMenu.type === 'node' ? moveNodeToFront : undefined}
                                onToBack={graphContextMenu.type === 'node' ? moveNodeToBack : undefined}
                                onProperties={graphContextMenu.type === 'node' ? handlePropertiesFromMenu : undefined}
                            />
                        )}

                        {quickAddMenu && (
                            <QuickAddMenu
                                x={quickAddMenu.x}
                                y={quickAddMenu.y}
                                onClose={() => setQuickAddMenu(null)}
                                onAdd={(type) => addConnectedNode(type, quickAddMenu.x, quickAddMenu.y, quickAddMenu.sourceNodeId, quickAddMenu.sourceHandleId)}
                            />
                        )}

                        {/* n8n-Style Full-Screen Node Settings Modal */}
                        {showSettingsModal && selectedNode && selectedNodeDef && (
                            <NodeSettingsModal
                                node={selectedNode}
                                nodeDef={selectedNodeDef}
                                onClose={() => setShowSettingsModal(false)}
                                onConfigChange={handleConfigChange}
                                onRename={handleRenameNode}
                                onDelete={handleDeleteFromModal}
                                expressionModes={expressionModes}
                                onToggleExpression={(key) => setExpressionModes(prev => ({ ...prev, [key]: !prev[key] }))}
                            />
                        )}

                        {!showRightPanel && (
                            <button
                                className="absolute top-3 right-3 btn btn-sm btn-ghost gap-1 bg-base-100/80 backdrop-blur border border-base-300 shadow-lg z-10"
                                onClick={() => { setRightPanelTab('variables'); setShowRightPanel(true); }}
                                title="Workflow Variables"
                            >
                                <Braces size={14} className="text-warning" /> Vars
                                {varEntries.length > 0 && <span className="badge badge-xs badge-warning">{varEntries.length}</span>}
                            </button>
                        )}
                    </div>

                    {showRightPanel && (
                        <div className="w-80 border-l border-base-300 bg-base-200/50 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
                            <div className="flex items-center border-b border-base-300 shrink-0">
                                <button
                                    className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors", rightPanelTab === 'properties' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-base-content/40 hover:text-base-content/60")}
                                    onClick={() => setRightPanelTab('properties')}
                                >Properties</button>
                                <button
                                    className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1", rightPanelTab === 'variables' ? "text-warning border-b-2 border-warning bg-warning/5" : "text-base-content/40 hover:text-base-content/60")}
                                    onClick={() => setRightPanelTab('variables')}
                                ><Braces size={10} /> Variables {varEntries.length > 0 && <span className="badge badge-xs badge-warning ml-1">{varEntries.length}</span>}</button>
                                <button
                                    className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors", rightPanelTab === 'data' ? "text-success border-b-2 border-success bg-success/5" : "text-base-content/40 hover:text-base-content/60")}
                                    onClick={() => setRightPanelTab('data')}
                                >Data</button>
                                <button className="btn btn-xs btn-ghost btn-square mx-1" onClick={() => setShowRightPanel(false)}><X size={14} /></button>
                            </div>

                            {rightPanelTab === 'properties' && (
                                selectedNode && selectedNodeDef ? (
                                    <>
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300 shrink-0">
                                            {(() => { const IC = selectedNodeDef.icon; return <IC size={16} className={`text-${selectedNodeDef.color}`} />; })()}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold">{selectedNodeDef.label}</div>
                                                <div className="text-[9px] opacity-40">{selectedNodeDef.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar">
                                            <div className="form-control w-full">
                                                <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Name</span></label>
                                                <input type="text" className="input input-xs input-bordered" value={(selectedNode.data as any).label} onChange={(e) => {
                                                    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
                                                    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, label: e.target.value } } : null);
                                                }} />
                                            </div>
                                            <div className="form-control w-full">
                                                <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">ID</span></label>
                                                <input type="text" value={selectedNode.id} readOnly className="input input-xs input-bordered bg-base-300/50 font-mono text-[10px] opacity-40" />
                                            </div>
                                            {selectedNodeDef.params.length > 0 && <div className="divider text-[9px] opacity-30 uppercase tracking-widest my-2">Parameters</div>}
                                            {selectedNodeDef.params.map(param => (
                                                <ParamField
                                                    key={param.key}
                                                    param={param}
                                                    value={(selectedNode.data as any).config?.[param.key]}
                                                    onChange={handleConfigChange}
                                                    expressionMode={!!expressionModes[`${selectedNode.id}:${param.key}`]}
                                                    onToggleExpression={() => setExpressionModes(prev => ({ ...prev, [`${selectedNode.id}:${param.key}`]: !prev[`${selectedNode.id}:${param.key}`] }))}
                                                />
                                            ))}
                                        </div>
                                        <div className="border-t border-base-300 p-3 shrink-0">
                                            <button className="btn btn-sm btn-error btn-outline gap-2 w-full" onClick={() => {
                                                setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                                setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                                                setSelectedNode(null);
                                            }}><Trash2 size={14} /> Delete Node</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-8 text-center">
                                        <div className="text-sm">Select a node</div>
                                    </div>
                                )
                            )}

                            {rightPanelTab === 'variables' && (
                                <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                                    <div className="space-y-2">
                                        {varEntries.map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                                <input type="text" value={k} readOnly className="input input-xs input-bordered w-24 font-mono bg-base-200 shrink-0" />
                                                <input type="text" value={v as string} className="input input-xs input-bordered flex-1 font-mono" onChange={(e) => updateVars({ ...vars, [k]: e.target.value })} />
                                                <button className="btn btn-xs btn-ghost btn-square text-error shrink-0" onClick={() => { const nv = { ...vars }; delete nv[k]; updateVars(nv); }}><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                        <div className="divider text-[9px] opacity-20 my-1">Add</div>
                                        <div className="flex items-center gap-1.5">
                                            <input type="text" placeholder="key" className="input input-xs input-bordered w-24 font-mono shrink-0" value={newVarKey} onChange={(e) => setNewVarKey(e.target.value)} />
                                            <input type="text" placeholder="value" className="input input-xs input-bordered flex-1 font-mono" value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)} />
                                            <button className="btn btn-xs btn-primary btn-square shrink-0" onClick={() => { if (!newVarKey.trim()) return; updateVars({ ...vars, [newVarKey.trim()]: newVarValue }); setNewVarKey(''); setNewVarValue(''); }} disabled={!newVarKey.trim()}><Plus size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === 'data' && (
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    {selectedNode ? (
                                        (() => {
                                            const lastStep = executionState.slice().reverse().find(s => s.nodeId === selectedNode.id);
                                            if (!lastStep) {
                                                return (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-8 text-center">
                                                        <div className="text-xs">No execution data</div>
                                                        <div className="text-[10px]">Run the workflow to see data</div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="flex-1 p-2">
                                                    <Editor
                                                        height="100%"
                                                        defaultLanguage="json"
                                                        value={JSON.stringify(lastStep.output, null, 2)}
                                                        theme={monacoTheme}
                                                        options={{ minimap: { enabled: false }, readOnly: true, fontSize: 11 }}
                                                    />
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-8 text-center">
                                            <div className="text-sm">Select a node</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1">
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={tab.content}
                        theme={monacoTheme}
                        options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
                        onChange={(val) => onContentChange?.(val || "")}
                    />
                </div>
            )}
        </div>
    );
}

export const WorkflowView: React.FC<WorkflowViewProps> = (props) => (
    <ReactFlowProvider>
        <WorkflowViewInner {...props} />
    </ReactFlowProvider>
);
