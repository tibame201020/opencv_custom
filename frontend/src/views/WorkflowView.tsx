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
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Editor from '@monaco-editor/react';
import { useAppStore, type WorkflowTab } from '../store';
import {
    Trash2, ChevronDown, X, GripVertical, Plus,
    Braces, ToggleLeft
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import {
    NODE_DEFINITIONS, getNodeDef, getNodesByCategory, getDefaultConfig,
    CATEGORY_LABELS, CATEGORY_COLORS,
    type NodeCategory, type ParamSchema
} from '../workflow/nodeRegistry';

/* ============================================================
 *  Generic Node Component (driven by NodeRegistry)
 * ============================================================ */
const GenericNode = ({ data, type }: { data: any; type?: string }) => {
    const def = getNodeDef(type || data.nodeType || 'click');
    const IconComp = def?.icon;
    const borderColor = def ? `border-${def.color}` : 'border-base-300';
    const textColor = def ? `text-${def.color}` : 'text-base-content';

    return (
        <div className={clsx(
            "px-4 py-2.5 shadow-lg rounded-lg bg-base-100 border-2 min-w-[160px] max-w-[220px]",
            borderColor
        )}>
            <div className="flex items-center gap-2 mb-1">
                {IconComp && <IconComp size={14} className={textColor} />}
                <div className="text-xs font-bold uppercase tracking-wider truncate">{data.label || def?.label || 'Node'}</div>
            </div>
            {data.subtitle && (
                <div className="text-[10px] opacity-50 font-mono truncate">{data.subtitle}</div>
            )}

            <Handle type="target" position={Position.Top} className={clsx("w-2.5 h-2.5", `!bg-${def?.color || 'base-300'}`)} />

            {def?.handleConfig?.sources ? (
                def.handleConfig.sources.map((src, i) => (
                    <Handle
                        key={src.id}
                        type="source"
                        position={Position.Bottom}
                        id={src.id}
                        title={src.label}
                        className={clsx("w-2.5 h-2.5", src.id === 'false' || src.id === 'done' ? '!bg-error' : '!bg-success')}
                        style={{ left: src.position || `${30 + i * 40}%` }}
                    />
                ))
            ) : (
                <Handle type="source" position={Position.Bottom} className={clsx("w-2.5 h-2.5", `!bg-${def?.color || 'base-300'}`)} />
            )}
        </div>
    );
};

/* ============================================================
 *  Build nodeTypes map dynamically from registry
 * ============================================================ */
const nodeTypes: Record<string, any> = {};
NODE_DEFINITIONS.forEach(def => {
    nodeTypes[def.type] = GenericNode;
});

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
}

/* ============================================================
 *  Right Panel Tab Type
 * ============================================================ */
type RightPanelTab = 'properties' | 'variables';

/* ============================================================
 *  Inner Component (needs ReactFlowProvider)
 * ============================================================ */
const WorkflowViewInner: React.FC<WorkflowViewProps> = ({ tab, onContentChange }) => {
    const { theme } = useAppStore();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const { screenToFlowPosition } = useReactFlow();
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        platform: true, vision: true, flow: true
    });
    const [expressionModes, setExpressionModes] = useState<Record<string, boolean>>({});
    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');

    // Clipboard for copy/paste
    const clipboardRef = useRef<Node[]>([]);

    // Parse workflow data from tab content
    const workflowData = useMemo(() => {
        try { return JSON.parse(tab.content); } catch { return { nodes: {}, edges: [], variables: {} }; }
    }, [tab.id]);

    // Convert backend format to React Flow format
    const initialNodes: Node[] = useMemo(() => {
        const nodesMap = workflowData.nodes || {};
        return Object.values(nodesMap).map((n: any) => {
            const def = getNodeDef(n.type);
            let subtitle = '';
            if (n.config) {
                const entries = Object.entries(n.config).slice(0, 2);
                subtitle = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
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
                },
            };
        });
    }, [workflowData]);

    const initialEdges: Edge[] = useMemo(() => {
        const edgeArr = workflowData.edges || [];
        return edgeArr.map((e: any) => ({
            id: e.id,
            source: e.fromNodeId || e.source,
            target: e.toNodeId || e.target,
            sourceHandle: e.signal && e.signal !== 'success' ? e.signal : undefined,
            label: e.signal || 'success',
            animated: true,
            style: { stroke: e.signal === 'false' ? '#ff52d9' : '#00d2ff', strokeWidth: 2 },
        }));
    }, [workflowData]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params, label: 'success', animated: true, style: { strokeWidth: 2 }
        }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
        setRightPanelTab('properties');
        setShowRightPanel(true);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        // Don't close panel — keep variables visible if that's the active tab
        if (rightPanelTab === 'properties') setShowRightPanel(false);
    }, [rightPanelTab]);

    // Sync graph state → parent
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

    // Drag & Drop
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type) return;
        const def = getNodeDef(type);
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const config = getDefaultConfig(type);
        const newNode: Node = {
            id: uuidv4(), type, position,
            data: { label: def?.label || 'Node', nodeType: type, config, subtitle: '' },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes, screenToFlowPosition]);

    // Node config update
    const handleConfigChange = useCallback((key: string, value: any) => {
        if (!selectedNode) return;
        setNodes(nds => nds.map(n => {
            if (n.id !== selectedNode.id) return n;
            const newConfig = { ...(n.data as any).config, [key]: value };
            const entries = Object.entries(newConfig).filter(([, v]) => v !== undefined && v !== '').slice(0, 2);
            const subtitle = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
            return { ...n, data: { ...n.data as any, config: newConfig, subtitle } };
        }));
        setSelectedNode(prev => {
            if (!prev) return null;
            const newConfig = { ...(prev.data as any).config, [key]: value };
            return { ...prev, data: { ...prev.data as any, config: newConfig } };
        });
    }, [selectedNode, setNodes]);

    /* ── Keyboard Shortcuts ─────────────────────────────── */
    const deleteSelectedNodes = useCallback(() => {
        const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
        if (selectedIds.length === 0 && selectedNode) selectedIds.push(selectedNode.id);
        if (selectedIds.length === 0) return;
        setNodes(nds => nds.filter(n => !selectedIds.includes(n.id)));
        setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
        if (selectedNode && selectedIds.includes(selectedNode.id)) setSelectedNode(null);
    }, [nodes, selectedNode, setNodes, setEdges]);

    const copySelectedNodes = useCallback(() => {
        const sel = nodes.filter(n => n.selected);
        if (sel.length === 0 && selectedNode) sel.push(selectedNode);
        clipboardRef.current = sel.map(n => ({ ...n }));
    }, [nodes, selectedNode]);

    const pasteNodes = useCallback(() => {
        if (clipboardRef.current.length === 0) return;
        const offset = 40;
        const newNodes = clipboardRef.current.map(n => ({
            ...n,
            id: uuidv4(),
            position: { x: n.position.x + offset, y: n.position.y + offset },
            selected: false,
            data: { ...(n.data as any) },
        }));
        setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes]);
    }, [setNodes]);

    const selectAllNodes = useCallback(() => {
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
    }, [setNodes]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't capture shortcuts when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement)?.contentEditable === 'true') return;

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelectedNodes();
            }
            // Ctrl+C / Cmd+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelectedNodes();
            }
            // Ctrl+V / Cmd+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteNodes();
            }
            // Ctrl+A / Cmd+A
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                selectAllNodes();
            }
            // Ctrl+D / Cmd+D — Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                copySelectedNodes();
                pasteNodes();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteSelectedNodes, copySelectedNodes, pasteNodes, selectAllNodes]);

    // Variables CRUD helpers
    const getVars = useCallback((): Record<string, string> => {
        try { return JSON.parse(tab.content)?.variables || {}; } catch { return {}; }
    }, [tab.content]);

    const updateVars = useCallback((newVars: Record<string, string>) => {
        try {
            const data = JSON.parse(tab.content);
            data.variables = newVars;
            onContentChange?.(JSON.stringify(data, null, 2));
        } catch { /* ignore */ }
    }, [tab.content, onContentChange]);

    // Theme
    const flowColorMode = useMemo(() => {
        const lightThemes = ['light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord'];
        return lightThemes.includes(theme) ? 'light' : 'dark';
    }, [theme]);
    const monacoTheme = useMemo(() => {
        const lightThemes = ['light', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk', 'autumn', 'acid', 'lemonade', 'winter', 'nord'];
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
                    {/* Node Palette (3 categories) */}
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

                    {/* React Flow Canvas */}
                    <div className="flex-1 relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            nodeTypes={nodeTypes}
                            fitView
                            colorMode={flowColorMode}
                            deleteKeyCode={null}
                            multiSelectionKeyCode="Shift"
                            selectionKeyCode="Shift"
                            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
                        >
                            <Background variant={"dots" as any} gap={20} size={1} />
                            <Controls />
                            <MiniMap zoomable pannable />
                        </ReactFlow>

                        {/* Floating Vars toggle */}
                        {!showRightPanel && (
                            <button
                                className="absolute top-3 right-3 btn btn-sm btn-ghost gap-1 bg-base-100/80 backdrop-blur border border-base-300 shadow-lg z-10"
                                onClick={() => { setRightPanelTab('variables'); setShowRightPanel(true); }}
                                title="Workflow Variables"
                            >
                                <Braces size={14} className="text-warning" /> Vars
                                {varEntries.length > 0 && (
                                    <span className="badge badge-xs badge-warning">{varEntries.length}</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Right Sidebar Panel (Properties / Variables) */}
                    {showRightPanel && (
                        <div className="w-80 border-l border-base-300 bg-base-200/50 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
                            {/* Panel Tab Bar */}
                            <div className="flex items-center border-b border-base-300 shrink-0">
                                <button
                                    className={clsx(
                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
                                        rightPanelTab === 'properties'
                                            ? "text-primary border-b-2 border-primary bg-primary/5"
                                            : "text-base-content/40 hover:text-base-content/60"
                                    )}
                                    onClick={() => setRightPanelTab('properties')}
                                >
                                    Properties
                                </button>
                                <button
                                    className={clsx(
                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1",
                                        rightPanelTab === 'variables'
                                            ? "text-warning border-b-2 border-warning bg-warning/5"
                                            : "text-base-content/40 hover:text-base-content/60"
                                    )}
                                    onClick={() => setRightPanelTab('variables')}
                                >
                                    <Braces size={10} /> Variables
                                    {varEntries.length > 0 && <span className="badge badge-xs badge-warning ml-1">{varEntries.length}</span>}
                                </button>
                                <button className="btn btn-xs btn-ghost btn-square mx-1" onClick={() => setShowRightPanel(false)}>
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Properties Tab */}
                            {rightPanelTab === 'properties' && (
                                selectedNode && selectedNodeDef ? (
                                    <>
                                        {/* Node Header */}
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300 shrink-0">
                                            {(() => { const IC = selectedNodeDef.icon; return <IC size={16} className={`text-${selectedNodeDef.color}`} />; })()}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold">{selectedNodeDef.label}</div>
                                                <div className="text-[9px] opacity-40">{selectedNodeDef.description}</div>
                                            </div>
                                        </div>

                                        {/* Scrollable Content */}
                                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar">
                                            {/* Node Name */}
                                            <div className="form-control w-full">
                                                <label className="label py-1">
                                                    <span className="text-[10px] uppercase font-bold opacity-50">Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input input-xs input-bordered"
                                                    value={(selectedNode.data as any).label}
                                                    onChange={(e) => {
                                                        setNodes(nds => nds.map(n => n.id === selectedNode.id
                                                            ? { ...n, data: { ...n.data as any, label: e.target.value } } : n));
                                                        setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data as any, label: e.target.value } } : null);
                                                    }}
                                                />
                                            </div>

                                            {/* Node ID */}
                                            <div className="form-control w-full">
                                                <label className="label py-1">
                                                    <span className="text-[10px] uppercase font-bold opacity-50">ID</span>
                                                </label>
                                                <input type="text" value={selectedNode.id} readOnly
                                                    className="input input-xs input-bordered bg-base-300/50 font-mono text-[10px] opacity-40 cursor-not-allowed" />
                                            </div>

                                            {selectedNodeDef.params.length > 0 && (
                                                <div className="divider text-[9px] opacity-30 uppercase tracking-widest my-2">Parameters</div>
                                            )}

                                            {selectedNodeDef.params.map(param => {
                                                const exprKey = `${selectedNode.id}:${param.key}`;
                                                return (
                                                    <ParamField
                                                        key={param.key}
                                                        param={param}
                                                        value={(selectedNode.data as any).config?.[param.key]}
                                                        onChange={handleConfigChange}
                                                        expressionMode={!!expressionModes[exprKey]}
                                                        onToggleExpression={() => setExpressionModes(prev => ({
                                                            ...prev, [exprKey]: !prev[exprKey]
                                                        }))}
                                                    />
                                                );
                                            })}

                                            {selectedNodeDef.outputs.length > 0 && (
                                                <>
                                                    <div className="divider text-[9px] opacity-30 uppercase tracking-widest my-2">Outputs</div>
                                                    <div className="space-y-1">
                                                        {selectedNodeDef.outputs.map(out => (
                                                            <div key={out.key} className="flex items-center justify-between py-1 px-2 bg-base-300/30 rounded-md">
                                                                <span className="text-[10px] font-mono opacity-60">{out.key}</span>
                                                                <span className="badge badge-xs badge-ghost font-mono">{out.type}</span>
                                                            </div>
                                                        ))}
                                                        <div className="text-[9px] opacity-30 px-2 mt-1">
                                                            Reference: <code className="text-warning">{'{{ $nodes["' + (selectedNode.data as any).label + '"].output.' + selectedNodeDef.outputs[0]?.key + ' }}'}</code>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="border-t border-base-300 p-3 shrink-0">
                                            <button
                                                className="btn btn-sm btn-error btn-outline gap-2 w-full"
                                                onClick={() => {
                                                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                                    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                                                    setSelectedNode(null);
                                                }}
                                            >
                                                <Trash2 size={14} /> Delete Node
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-8 text-center">
                                        <div className="text-sm">Select a node</div>
                                        <div className="text-[10px] mt-1 opacity-60">Click on a node to view its properties</div>
                                    </div>
                                )
                            )}

                            {/* Variables Tab */}
                            {rightPanelTab === 'variables' && (
                                <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                                    <p className="text-[10px] opacity-40 mb-3">
                                        Global variables for this workflow. Reference via <code className="text-warning">{'{{ $vars.key }}'}</code>
                                    </p>

                                    <div className="space-y-2">
                                        {varEntries.map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-1.5">
                                                <input
                                                    type="text" value={k} readOnly
                                                    className="input input-xs input-bordered w-24 font-mono bg-base-200 cursor-not-allowed shrink-0"
                                                />
                                                <input
                                                    type="text" value={v}
                                                    className="input input-xs input-bordered flex-1 font-mono"
                                                    onChange={(e) => updateVars({ ...vars, [k]: e.target.value })}
                                                />
                                                <button
                                                    className="btn btn-xs btn-ghost btn-square text-error shrink-0"
                                                    onClick={() => {
                                                        const newVars = { ...vars };
                                                        delete newVars[k];
                                                        updateVars(newVars);
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {varEntries.length === 0 && (
                                            <div className="text-center text-xs opacity-20 py-6">No variables defined</div>
                                        )}

                                        <div className="divider text-[9px] opacity-20 my-1">Add</div>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text" placeholder="key"
                                                className="input input-xs input-bordered w-24 font-mono shrink-0"
                                                value={newVarKey}
                                                onChange={(e) => setNewVarKey(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newVarKey.trim()) {
                                                        updateVars({ ...vars, [newVarKey.trim()]: newVarValue });
                                                        setNewVarKey('');
                                                        setNewVarValue('');
                                                    }
                                                }}
                                            />
                                            <input
                                                type="text" placeholder="value"
                                                className="input input-xs input-bordered flex-1 font-mono"
                                                value={newVarValue}
                                                onChange={(e) => setNewVarValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newVarKey.trim()) {
                                                        updateVars({ ...vars, [newVarKey.trim()]: newVarValue });
                                                        setNewVarKey('');
                                                        setNewVarValue('');
                                                    }
                                                }}
                                            />
                                            <button
                                                className="btn btn-xs btn-primary btn-square shrink-0"
                                                onClick={() => {
                                                    if (!newVarKey.trim()) return;
                                                    updateVars({ ...vars, [newVarKey.trim()]: newVarValue });
                                                    setNewVarKey('');
                                                    setNewVarValue('');
                                                }}
                                                disabled={!newVarKey.trim()}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* YAML / JSON Editor View */
                <div className="flex-1">
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={tab.content}
                        theme={monacoTheme}
                        options={{
                            minimap: { enabled: false }, fontSize: 14,
                            automaticLayout: true, lineNumbers: 'on',
                            roundedSelection: true, scrollBeyondLastLine: false,
                        }}
                        onChange={(val) => onContentChange?.(val || "")}
                    />
                </div>
            )}
        </div>
    );
};

/* ============================================================
 *  Exported Wrapper
 * ============================================================ */
export const WorkflowView: React.FC<WorkflowViewProps> = (props) => (
    <ReactFlowProvider>
        <WorkflowViewInner {...props} />
    </ReactFlowProvider>
);
