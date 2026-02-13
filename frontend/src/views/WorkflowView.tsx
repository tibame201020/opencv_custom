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
    Trash2, X, GripVertical, Plus,
    Braces, ToggleLeft, Play, Save,
    Focus, Minus, Check, Loader2, AlertCircle,
    ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import {
    getNodeDef, getNodesByCategory, getDefaultConfig,
    CATEGORY_LABELS, CATEGORY_COLORS,
    type NodeCategory, type ParamSchema
} from '../workflow/nodeRegistry';
import { AssetPickerModal } from '../components/AssetPickerModal';

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

    const isRunning = data.status === 'running';
    const isSuccess = data.status === 'success';
    const isError = data.status === 'error';

    return (
        <div className={clsx(
            "group relative bg-base-100 rounded-xl border-2 transition-all duration-300 shadow-sm hover:shadow-md",
            borderColor,
            isRunning && "n8n-node-running ring-4 ring-primary/20",
            "n8n-node-pop"
        )}>
            {selected && (
                <NodeResizer
                    minWidth={160}
                    minHeight={80}
                    lineStyle={RESIZER_LINE_STYLE}
                    handleClassName="w-2 h-2 bg-primary border-none rounded-full"
                />
            )}

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

            {def?.type !== 'click' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3 h-3 border-2 border-base-100 bg-base-300 rounded-full hover:bg-primary transition-colors"
                />
            )}

            {(() => {
                const config = def?.handleConfig;
                let sources = config?.sources || [{ id: 'success', label: 'Success' }];

                if (type === 'switch') {
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
                    const top = sources.length === 1 ? '50%' : `${((index + 1) * 100) / (sources.length + 1)}%`;
                    let bg = 'bg-success';
                    if (source.id === 'false' || source.id === 'default') bg = 'bg-base-content/20';
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
    switch: GenericNode, // Added switch
};

/* ============================================================
 *  n8n Style Quick Add Menu (Floating)
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
 *  Node Library (Right Panel)
 * ============================================================ */
interface NodeLibraryProps {
    onAdd: (type: string) => void;
    onClose: () => void;
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onAdd }) => {
    const categories = getNodesByCategory();
    const [search, setSearch] = useState('');

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-base-300">
                <h3 className="font-bold text-sm uppercase tracking-wider opacity-70 mb-2">Node Library</h3>
                <input
                    autoFocus
                    type="text"
                    placeholder="Search nodes..."
                    className="input input-sm input-bordered w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
                {(Object.keys(categories) as NodeCategory[]).map(cat => (
                    <div key={cat}>
                        <div className={clsx("text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1.5 px-2", CATEGORY_COLORS[cat])}>
                            {CATEGORY_LABELS[cat]}
                        </div>
                        <div className="space-y-0.5">
                            {categories[cat].filter(d => d.label.toLowerCase().includes(search.toLowerCase())).map(def => {
                                const IconComp = def.icon;
                                return (
                                    <button
                                        key={def.type}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-all text-left group"
                                        onClick={() => onAdd(def.type)}
                                    >
                                        <div className={clsx("p-2 rounded-lg bg-base-200 group-hover:bg-white shadow-sm transition-all", `text-${def.color}`)}>
                                            <IconComp size={16} />
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
        </div>
    );
}

/* ============================================================
 *  Typed Properties Panel Components
 * ============================================================ */
interface ParamFieldProps {
    param: ParamSchema;
    value: any;
    onChange: (key: string, value: any) => void;
    expressionMode: boolean;
    onToggleExpression: () => void;
    workflowId: string;
}

const ParamField: React.FC<ParamFieldProps> = ({
    param, value, onChange, expressionMode, onToggleExpression, workflowId
}) => {
    const { theme } = useAppStore();
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

    if (expressionMode) {
        return (
            <div className="form-control w-full">
                <label className="label py-1">
                    <span className="text-[10px] uppercase font-bold opacity-50">{param.label}</span>
                    <button className="btn btn-xs btn-ghost gap-1 text-warning" onClick={onToggleExpression} title="Switch to Fixed value">
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
            </div>
        );
    }

    const commonLabel = (
        <label className="label py-1">
            <span className="text-[10px] uppercase font-bold opacity-50">
                {param.label} {param.required && <span className="text-error">*</span>}
            </span>
            <button className="btn btn-xs btn-ghost gap-1 opacity-30 hover:opacity-100" onClick={onToggleExpression} title="Switch to Expression">
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
                        min={param.min} max={param.max} step={param.type === 'float' ? 0.1 : 1}
                    />
                </div>
            );
        case 'string':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <input type="text" className="input input-xs input-bordered" value={value ?? ''} onChange={(e) => onChange(param.key, e.target.value)} placeholder={param.placeholder} />
                </div>
            );
        case 'boolean':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={!!value} onChange={(e) => onChange(param.key, e.target.checked)} />
                </div>
            );
        case 'select':
            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <select className="select select-xs select-bordered" value={value ?? param.defaultValue ?? ''} onChange={(e) => onChange(param.key, e.target.value)}>
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
                        <button className="btn btn-xs btn-square" onClick={() => setIsAssetPickerOpen(true)} title="Browse">
                            <Plus size={12} />
                        </button>
                    </div>
                    <AssetPickerModal
                        isOpen={isAssetPickerOpen}
                        scriptId={`workflow:${workflowId}`}
                        onClose={() => setIsAssetPickerOpen(false)}
                        onSelect={(path) => onChange(param.key, path)}
                    />
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
                </div>
            );
        case 'expression':
            return (
                <div className="form-control w-full">
                    <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">{param.label}</span></label>
                    <input type="text" className="input input-xs input-bordered font-mono text-warning bg-warning/5 border-warning/30" value={value ?? ''} onChange={(e) => onChange(param.key, e.target.value)} placeholder={param.placeholder || '{{ ... }}'} />
                </div>
            );
        case 'json':
            return (
                <div className="form-control w-full h-[200px]">
                    {commonLabel}
                    <div className="h-full border border-base-300 rounded-lg overflow-hidden">
                        <Editor height="100%" defaultLanguage="json" value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? '{}')} onChange={(val) => onChange(param.key, val)} options={{ minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false, fontSize: 12, fontFamily: 'monospace', automaticLayout: true }} theme={theme === 'dark' ? 'vs-dark' : 'light'} />
                    </div>
                </div>
            );
        default: return null;
    }
};

/* ============================================================
 *  Props
 * ============================================================ */
interface WorkflowViewProps {
    tab: WorkflowTab;
    onContentChange?: (content: string) => void;
    onRun?: () => void;
    onSave?: () => void;
    onBack: () => void;
    isExecuting?: boolean;
    isSaving?: boolean;
    executionState?: any[];
}

type RightPanelTab = 'properties' | 'variables' | 'data' | 'library';

/* ============================================================
 *  Inner Component
 * ============================================================ */
function WorkflowViewInner({ tab, onContentChange, onRun, onSave, onBack, isExecuting = false, isSaving = false, executionState = [] }: WorkflowViewProps) {
    const { theme } = useAppStore();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const [expressionModes, setExpressionModes] = useState<Record<string, boolean>>({});
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');

    const [quickAddMenu, setQuickAddMenu] = useState<{ x: number, y: number, sourceNodeId?: string, sourceHandleId?: string } | null>(null);
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

    const workflowData = useMemo(() => {
        try { return JSON.parse(tab.content); } catch { return { nodes: {}, edges: [], variables: {} }; }
    }, [tab.content]);

    const initialNodes: Node[] = useMemo(() => {
        const nodesMap = workflowData.nodes || {};
        return Object.values(nodesMap).map((n: any) => {
            const def = getNodeDef(n.type);
            const subtitle = n.config ? Object.entries(n.config).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
            const executedStep = executionState.find(s => s.nodeId === n.id);
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
                    status: executedStep ? 'success' : undefined,
                },
            };
        });
    }, [workflowData, executionState]);

    const initialEdges: Edge[] = useMemo(() => {
        const edgeArr = workflowData.edges || [];
        const completedNodes = new Map<string, string>();
        executionState.forEach(step => completedNodes.set(step.nodeId, step.signal));

        return edgeArr.map((e: any) => {
            const { stroke, strokeWidth } = e.style || {};
            const sourceSignal = completedNodes.get(e.fromNodeId || e.source);
            const edgeSignal = e.signal || 'success';
            const isTraversed = sourceSignal && (sourceSignal === edgeSignal || (edgeSignal === 'success' && sourceSignal === 'success'));
            let edgeColor = stroke || '#94a3b8';
            let animated = isExecuting;
            if (isTraversed) { edgeColor = '#22c55e'; animated = false; }
            else if (isExecuting) { edgeColor = '#ff6d5a'; }
            if (e.signal === 'false') edgeColor = '#ff52d9';
            if (isTraversed) edgeColor = '#22c55e';

            return {
                id: e.id,
                source: e.fromNodeId || e.source,
                target: e.toNodeId || e.target,
                sourceHandle: e.signal && e.signal !== 'success' ? e.signal : undefined,
                label: e.signal || 'success',
                type: 'hover',
                animated,
                className: isExecuting || isTraversed ? 'n8n-flow-active' : '',
                style: { stroke: edgeColor, strokeWidth: isTraversed ? 4 : (strokeWidth || 3) },
                interactionWidth: 20,
            };
        });
    }, [workflowData, isExecuting, executionState]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => { setNodes(initialNodes); setEdges(initialEdges); }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Edge Toolbar Events
    useEffect(() => {
        const handleEdgeDelete = (e: any) => setEdges(eds => eds.filter(edge => edge.id !== e.detail.edgeId));
        const handleEdgeInsert = (e: any) => {
            const { edgeId } = e.detail;
            const edge = edges.find(ed => ed.id === edgeId);
            if (!edge) return;
            setQuickAddMenu({ x: e.detail.x || 400, y: e.detail.y || 300, sourceNodeId: edge.source, sourceHandleId: edge.sourceHandle || undefined });
            setEdges(eds => eds.filter(ed => ed.id !== edgeId));
        };
        window.addEventListener('workflow-edge-delete', handleEdgeDelete);
        window.addEventListener('workflow-edge-insert', handleEdgeInsert);
        return () => {
            window.removeEventListener('workflow-edge-delete', handleEdgeDelete);
            window.removeEventListener('workflow-edge-insert', handleEdgeInsert);
        };
    }, [edges, setEdges]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, label: 'success', type: 'hover', animated: true, style: { strokeWidth: 3, stroke: '#94a3b8' }, interactionWidth: 20 } as any, eds)), [setEdges]);
    const onConnectStart: OnConnectStart = useCallback((_, { nodeId, handleId }) => { connectingNodeId.current = nodeId; connectingHandleId.current = handleId; }, []);
    const onConnectEnd: OnConnectEnd = useCallback((event) => {
        if (!connectingNodeId.current) return;
        const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');
        if (targetIsPane) {
            setQuickAddMenu({ x: (event as MouseEvent).clientX - 100, y: (event as MouseEvent).clientY - 200, sourceNodeId: connectingNodeId.current || undefined, sourceHandleId: connectingHandleId.current || undefined });
        }
        connectingNodeId.current = null;
        connectingHandleId.current = null;
    }, []);

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
        setRightPanelTab('properties');
        setShowRightPanel(true);
    }, []);

    const onPaneClick = useCallback(() => setSelectedNode(null), []);

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
            setEdges((eds) => addEdge({ id: uuidv4(), source: sourceId, target: newNodeId, sourceHandle: handleId, label: handleId === 'false' ? 'false' : 'success', ...DEFAULT_EDGE_OPTIONS } as any, eds));
        }
        setQuickAddMenu(null);
        // Auto select new node
        setSelectedNode(newNode);
        setShowRightPanel(true);
        setRightPanelTab('properties');
    }, [setNodes, setEdges]);

    useEffect(() => {
        const nodesMap: Record<string, any> = {};
        nodes.forEach(n => {
            nodesMap[n.id] = { id: n.id, name: (n.data as any).label || '', type: n.type || 'click', config: (n.data as any).config || {}, x: n.position.x, y: n.position.y, style: { width: n.width, height: n.height, ...n.style } };
        });
        const edgeArr = edges.map(e => ({ id: e.id, fromNodeId: e.source, toNodeId: e.target, signal: e.sourceHandle || String(e.label || 'success') }));
        const updated = { ...workflowData, nodes: nodesMap, edges: edgeArr };
        const json = JSON.stringify(updated, null, 2);
        if (json !== tab.content && onContentChange) onContentChange(json);
    }, [nodes, edges]);

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

    const getVars = useCallback(() => { try { return JSON.parse(tab.content)?.variables || {}; } catch { return {}; } }, [tab.content]);
    const updateVars = useCallback((newVars: Record<string, string>) => { try { const data = JSON.parse(tab.content); data.variables = newVars; onContentChange?.(JSON.stringify(data, null, 2)); } catch { } }, [tab.content, onContentChange]);

    const flowColorMode = useMemo(() => ['light', 'cupcake', 'emerald'].includes(theme) ? 'light' : 'dark', [theme]);
    const monacoTheme = useMemo(() => flowColorMode === 'light' ? 'light' : 'vs-dark', [flowColorMode]);
    const selectedNodeDef = selectedNode ? getNodeDef(selectedNode.type || '') : null;
    const varEntries = Object.entries(getVars());

    const handleAddNodeFromPanel = (type: string) => {
        // Add to center of view? Or random position
        const id = uuidv4();
        const def = getNodeDef(type);
        const newNode: Node = {
            id, type, position: { x: 100, y: 100 },
            data: { label: def?.label || 'Node', nodeType: type, config: getDefaultConfig(type), subtitle: '' }
        };
        setNodes(nds => nds.concat(newNode));
        setShowRightPanel(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-base-100 overflow-hidden relative">
            {/* Header / Toolbar */}
            <div className="h-12 border-b border-base-300 flex items-center justify-between px-4 bg-base-100 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button className="btn btn-sm btn-ghost gap-2" onClick={onBack}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="divider divider-horizontal my-2" />
                    <span className="font-bold text-sm">{tab.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className={clsx("btn btn-sm gap-2", tab.isDirty ? "btn-ghost text-warning" : "btn-ghost")}
                        onClick={onSave}
                        disabled={isSaving || !tab.isDirty}
                    >
                        <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-sm btn-primary gap-2" onClick={onRun} disabled={isExecuting}>
                        <Play size={14} /> {isExecuting ? 'Running...' : 'Run'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex relative overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 relative">
                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="text-center p-8 bg-base-100/50 backdrop-blur-sm rounded-2xl border border-base-300 shadow-xl pointer-events-auto">
                                <div className="text-lg font-bold mb-2">Empty Workflow</div>
                                <button className="btn btn-primary gap-2" onClick={() => { setRightPanelTab('library'); setShowRightPanel(true); }}>
                                    <Plus size={18} /> Add First Node
                                </button>
                            </div>
                        </div>
                    )}

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onConnectStart={onConnectStart}
                        onConnectEnd={onConnectEnd}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes as any}
                        edgeTypes={edgeTypes}
                        fitView
                        colorMode={flowColorMode}
                        deleteKeyCode={['Backspace', 'Delete']}
                        selectionOnDrag={true}
                        panOnDrag={PAN_ON_DRAG}
                        panOnScroll={true}
                        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                    >
                        <Background gap={24} color="#f8fafc" />
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 p-1.5 bg-base-100 border border-base-300 shadow-xl rounded-xl backdrop-blur-sm">
                            <button className="btn btn-sm btn-ghost btn-square" onClick={() => zoomIn()}><Plus size={18} /></button>
                            <button className="btn btn-sm btn-ghost btn-square" onClick={() => zoomOut()}><Minus size={18} /></button>
                            <button className="btn btn-sm btn-ghost btn-square" onClick={() => fitView()}><Focus size={18} /></button>
                        </div>
                        <Controls showInteractive={false} className="opacity-0 pointer-events-none" />
                        <MiniMap zoomable pannable className="opacity-0 pointer-events-none" />
                    </ReactFlow>

                    {/* Right Floating Button for Vars */}
                    {!showRightPanel && (
                        <button
                            className="absolute top-4 right-16 btn btn-sm btn-ghost gap-1 bg-base-100/80 backdrop-blur border border-base-300 shadow-lg z-10"
                            onClick={() => { setRightPanelTab('variables'); setShowRightPanel(true); }}
                        >
                            <Braces size={14} className="text-warning" />
                        </button>
                    )}

                    {/* Quick Add Menu (Floating) */}
                    {quickAddMenu && (
                        <QuickAddMenu
                            x={quickAddMenu.x}
                            y={quickAddMenu.y}
                            onClose={() => setQuickAddMenu(null)}
                            onAdd={(type) => addConnectedNode(type, quickAddMenu.x, quickAddMenu.y, quickAddMenu.sourceNodeId, quickAddMenu.sourceHandleId)}
                        />
                    )}
                </div>

                {/* Right Panel */}
                {showRightPanel && (
                    <div className="w-80 border-l border-base-300 bg-base-100 flex flex-col shadow-2xl z-20">
                        <div className="flex items-center border-b border-base-300 shrink-0">
                            <div className="flex-1 flex">
                                <button className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2", rightPanelTab === 'properties' ? "border-primary text-primary bg-primary/5" : "border-transparent opacity-50 hover:opacity-100")} onClick={() => setRightPanelTab('properties')}>Node</button>
                                <button className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2", rightPanelTab === 'library' ? "border-secondary text-secondary bg-secondary/5" : "border-transparent opacity-50 hover:opacity-100")} onClick={() => setRightPanelTab('library')}>Library</button>
                                <button className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2", rightPanelTab === 'variables' ? "border-warning text-warning bg-warning/5" : "border-transparent opacity-50 hover:opacity-100")} onClick={() => setRightPanelTab('variables')}>Vars</button>
                                <button className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2", rightPanelTab === 'data' ? "border-success text-success bg-success/5" : "border-transparent opacity-50 hover:opacity-100")} onClick={() => setRightPanelTab('data')}>Data</button>
                            </div>
                            <button className="btn btn-sm btn-ghost btn-square mx-1" onClick={() => setShowRightPanel(false)}><X size={16} /></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col bg-base-100/50">
                            {rightPanelTab === 'library' && (
                                <NodeLibrary onAdd={handleAddNodeFromPanel} onClose={() => setShowRightPanel(false)} />
                            )}

                            {rightPanelTab === 'properties' && (
                                selectedNode && selectedNodeDef ? (
                                    <>
                                        <div className="p-4 border-b border-base-300 flex items-center gap-3 bg-base-100">
                                            {(() => { const IC = selectedNodeDef.icon; return <IC size={24} className={`text-${selectedNodeDef.color}`} />; })()}
                                            <div>
                                                <div className="font-bold text-sm">{selectedNodeDef.label}</div>
                                                <div className="text-[10px] opacity-50">{selectedNodeDef.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                            <div className="form-control w-full">
                                                <label className="label py-1"><span className="text-[10px] uppercase font-bold opacity-50">Name</span></label>
                                                <input type="text" className="input input-sm input-bordered" value={(selectedNode.data as any).label} onChange={(e) => {
                                                    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
                                                    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, label: e.target.value } } : null);
                                                }} />
                                            </div>
                                            {selectedNodeDef.params.map(param => (
                                                <ParamField
                                                    key={param.key}
                                                    param={param}
                                                    value={(selectedNode.data as any).config?.[param.key]}
                                                    onChange={handleConfigChange}
                                                    expressionMode={!!expressionModes[`${selectedNode.id}:${param.key}`]}
                                                    onToggleExpression={() => setExpressionModes(prev => ({ ...prev, [`${selectedNode.id}:${param.key}`]: !prev[`${selectedNode.id}:${param.key}`] }))}
                                                    workflowId={tab.workflowId}
                                                />
                                            ))}
                                            <div className="divider"></div>
                                            <button className="btn btn-sm btn-error btn-outline w-full gap-2" onClick={() => {
                                                setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                                setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                                                setSelectedNode(null);
                                                setShowRightPanel(false);
                                            }}><Trash2 size={14} /> Delete Node</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-sm opacity-40 p-8 text-center">Select a node to edit properties</div>
                                )
                            )}

                            {rightPanelTab === 'variables' && (
                                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="space-y-2">
                                        {varEntries.map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2">
                                                <div className="badge badge-warning badge-outline font-mono text-xs">{k}</div>
                                                <div className="flex-1 truncate text-xs font-mono opacity-70">{v as string}</div>
                                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => { const nv = { ...getVars() }; delete nv[k]; updateVars(nv); }}><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                        <div className="divider text-[10px] opacity-30">New Variable</div>
                                        <div className="flex flex-col gap-2">
                                            <input className="input input-sm input-bordered" placeholder="Key" value={newVarKey} onChange={e => setNewVarKey(e.target.value)} />
                                            <input className="input input-sm input-bordered" placeholder="Value" value={newVarValue} onChange={e => setNewVarValue(e.target.value)} />
                                            <button className="btn btn-sm btn-primary w-full" onClick={() => { if (newVarKey) { updateVars({ ...getVars(), [newVarKey]: newVarValue }); setNewVarKey(''); setNewVarValue(''); } }}>Add</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === 'data' && (
                                <div className="flex-1 p-2 overflow-hidden flex flex-col gap-2">
                                    {selectedNode && executionState.find(s => s.nodeId === selectedNode.id) ? (
                                        <>
                                            <div className="flex-1 flex flex-col">
                                                <div className="text-[10px] font-bold uppercase opacity-40 px-1 mb-1">Input</div>
                                                <div className="flex-1 border border-base-300 rounded overflow-hidden">
                                                    <Editor height="100%" defaultLanguage="json" value={JSON.stringify(executionState.find(s => s.nodeId === selectedNode.id)?.input, null, 2)} theme={monacoTheme} options={{ minimap: { enabled: false }, readOnly: true, fontSize: 11 }} />
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <div className="text-[10px] font-bold uppercase opacity-40 px-1 mb-1">Output</div>
                                                <div className="flex-1 border border-base-300 rounded overflow-hidden">
                                                    <Editor height="100%" defaultLanguage="json" value={JSON.stringify(executionState.find(s => s.nodeId === selectedNode.id)?.output, null, 2)} theme={monacoTheme} options={{ minimap: { enabled: false }, readOnly: true, fontSize: 11 }} />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-sm opacity-40 p-8 text-center">Run workflow to see data</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export const WorkflowView: React.FC<WorkflowViewProps> = (props) => (
    <ReactFlowProvider>
        <WorkflowViewInner {...props} />
    </ReactFlowProvider>
);
