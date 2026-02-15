import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    ReactFlow,
    MiniMap,
    Background,
    BackgroundVariant,
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
    getBezierPath,
    getSmoothStepPath,
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
    MarkerType,
    ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Editor from '@monaco-editor/react';
import { useAppStore, type WorkflowTab } from '../store';
import {
    Trash2, ChevronDown, X, Plus,
    Braces, ToggleLeft, Play, Maximize,
    Loader2, Zap,
    ZoomIn, ZoomOut, Search
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import {
    getNodeDef, getDefaultConfig,
    type ParamSchema,
    NODE_DEFINITIONS
} from '../workflow/nodeRegistry';
import { ExpressionInput } from '../components/ExpressionInput';
import { WorkflowSidebar } from '../components/WorkflowSidebar';
import { N8nNode } from '../components/nodes/N8nNode';
import { ExecutionInspector } from '../components/ExecutionInspector';

const PAN_ON_DRAG = [2];
const DEFAULT_EDGE_OPTIONS = {
    type: 'hover' as const,
    animated: true,
    style: { strokeWidth: 2, stroke: '#b1b1b7' }, // n8n light grey
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#b1b1b7' },
    interactionWidth: 20
};

/* ============================================================
 *  n8n-Style Hover Edge with Midpoint Toolbar
 * ============================================================ */
const HoverEdge: React.FC<EdgeProps> = (props) => {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected, label } = props;
    const [hovered, setHovered] = useState(false);

    // Hybrid Edge Strategy:
    // - Forward Connections (Standard): Use Bezier for smooth S-curve.
    // - Backward/Loop Connections: Use SmoothStep (Manhattan) to avoid messy overlaps.
    const isForward = targetX > sourceX + 50;

    const [edgePath, labelX, labelY] = isForward
        ? getBezierPath({
            sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
        })
        : getSmoothStepPath({
            sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 20
        });

    return (
        <>
            <path
                d={edgePath}
                fill="none"
                strokeWidth={40}
                stroke="transparent"
                className="react-flow__edge-interaction cursor-pointer"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            />
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: (hovered || selected) ? 3 : 2,
                    stroke: (hovered || selected) ? '#22c55e' : (style?.stroke || '#cbd5e1'),
                    transition: 'stroke 0.15s, stroke-width 0.15s',
                }}
            />

            <EdgeLabelRenderer>
                {label && label !== 'success' && (
                    <div
                        className="absolute px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-medium text-gray-500 shadow-sm pointer-events-none z-10"
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 15}px)`,
                        }}
                    >
                        {label}
                    </div>
                )}

                <div
                    className={clsx(
                        "absolute flex items-center gap-1 p-0.5 rounded-full bg-white border border-gray-200 shadow-sm transition-all duration-150 pointer-events-auto z-20",
                        (hovered || selected) ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                    )}
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    <button
                        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
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
                    <div className="w-px h-3 bg-gray-200" />
                    <button
                        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete connection"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('workflow-edge-delete', {
                                detail: { edgeId: id }
                            }));
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

const edgeTypes = {
    hover: HoverEdge,
};

// Map all registered nodes to the N8nNode component
const nodeTypes: Record<string, any> = {};
NODE_DEFINITIONS.forEach(def => {
    nodeTypes[def.type] = N8nNode;
});

const EMPTY_ARRAY: any[] = [];

/* ============================================================
 *  Context Menu Component
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
    onAddNode?: () => void;
}

const GraphContextMenu: React.FC<GraphContextMenuProps> = ({
    type, x, y, onClose, onDelete, onDuplicate, onToFront, onToBack, onProperties, onAddNode
}) => {
    return (
        <div
            className="fixed bg-base-100 border border-base-300 shadow-2xl rounded-xl py-1.5 z-[100] min-w-[170px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            <div className="px-3 py-1 text-[9px] font-bold opacity-30 uppercase tracking-widest">{type} Actions</div>

            {onAddNode && (
                <button onClick={onAddNode} className="w-full text-left px-4 py-2 hover:bg-base-200 text-xs flex items-center gap-2">
                    <Plus size={14} className="text-primary" /> Add Node
                </button>
            )}

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
 *  Node Settings Modal
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
    nodes: Node[];
    executionState: any[];
}

const NodeSettingsModal: React.FC<NodeSettingsModalProps> = ({
    node, onClose, onConfigChange, onRename, onDelete,
    expressionModes, onToggleExpression, nodes, executionState
}) => {
    const { theme } = useAppStore();
    if (!node) return null;
    const nodeDef = getNodeDef(node.type || 'click');
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
                                            nodes={nodes}
                                            executionState={executionState}
                                        />
                                    ))}

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
                        {executionState.find(s => s.nodeId === node.id) ? (
                            <div className="flex-1 overflow-hidden relative">
                                <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    value={JSON.stringify(executionState.slice().reverse().find(s => s.nodeId === node.id)?.output, null, 2)}
                                    options={{ minimap: { enabled: false }, readOnly: true, fontSize: 11, lineNumbers: 'off' }}
                                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-base-content/20 p-4 text-center">
                                <div className="text-xs">No output data</div>
                                <div className="text-[10px] mt-1 opacity-60">Execute step to view output</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
 *  Param Field Component
 * ============================================================ */
interface ParamFieldProps {
    param: ParamSchema;
    value: any;
    onChange: (key: string, value: any) => void;
    expressionMode: boolean;
    onToggleExpression: () => void;
    nodes: Node[];
    executionState: any[];
}

const ParamField: React.FC<ParamFieldProps> = ({
    param, value, onChange, expressionMode, onToggleExpression, nodes, executionState
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
                <ExpressionInput
                    value={value || ''}
                    onChange={(val) => onChange(param.key, val)}
                    nodes={nodes}
                    executionState={executionState}
                    placeholder={param.placeholder || '{{ $node["..."].json.field }}'}
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
                    <ExpressionInput
                        value={value ?? ''}
                        onChange={(val) => onChange(param.key, val)}
                        nodes={nodes}
                        executionState={executionState}
                        placeholder={param.placeholder || '{{ ... }}'}
                    />
                    {param.description && <div className="text-[9px] opacity-30 mt-0.5 pl-1">{param.description}</div>}
                </div>
            );

        case 'key_value': {
            const pairs = typeof value === 'object' && value ? Object.entries(value) : [];
            const addPair = () => {
                const newKey = `key${pairs.length + 1}`;
                onChange(param.key, { ...value, [newKey]: '' });
            };
            const updateKey = (oldKey: string, newKey: string, val: any) => {
                const newValue = { ...value };
                delete newValue[oldKey];
                newValue[newKey] = val;
                onChange(param.key, newValue);
            };
            const updateValue = (key: string, val: any) => {
                onChange(param.key, { ...value, [key]: val });
            };
            const deletePair = (keyToDelete: string) => {
                const newValue = { ...value };
                delete newValue[keyToDelete];
                onChange(param.key, newValue);
            };

            return (
                <div className="form-control w-full">
                    {commonLabel}
                    <div className="space-y-2 mb-2">
                        {pairs.map(([k, v]) => (
                            <div key={k} className="flex gap-2 items-center">
                                <input
                                    className="input input-xs input-bordered w-1/3 text-xs font-mono"
                                    value={k}
                                    onChange={(e) => updateKey(k, e.target.value, v)}
                                    placeholder="Key"
                                />
                                <div className="flex-1 min-w-0">
                                    <ExpressionInput
                                        value={typeof v === 'string' ? v : JSON.stringify(v)}
                                        onChange={(val) => updateValue(k, val)}
                                        nodes={nodes}
                                        executionState={executionState}
                                        placeholder="Value"
                                    />
                                </div>
                                <button className="btn btn-xs btn-ghost btn-square text-error opacity-50 hover:opacity-100" onClick={() => deletePair(k)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-xs btn-outline btn-dashed w-full gap-2 opacity-60 hover:opacity-100" onClick={addPair}>
                        <Plus size={12} /> Add Variable
                    </button>
                    {param.description && <div className="text-[9px] opacity-30 mt-1 pl-1">{param.description}</div>}
                </div>
            );
        }

        case 'json':
            // Special handling for Switch Cases (List of Strings)
            if (param.key === 'cases' && param.label === 'Cases') {
                let cases: string[] = [];
                try {
                    cases = JSON.parse(value || '[]');
                    if (!Array.isArray(cases)) cases = [];
                } catch { cases = []; }

                const addCase = () => {
                    const newCases = [...cases, `${cases.length}`];
                    onChange(param.key, JSON.stringify(newCases));
                };
                const removeCase = (idx: number) => {
                    const newCases = cases.filter((_, i) => i !== idx);
                    onChange(param.key, JSON.stringify(newCases));
                };
                const updateCase = (idx: number, val: string) => {
                    const newCases = [...cases];
                    newCases[idx] = val;
                    onChange(param.key, JSON.stringify(newCases));
                };

                return (
                    <div className="form-control w-full">
                        {commonLabel}
                        <div className="space-y-2 mb-2">
                            {cases.map((c, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <div className="text-[10px] font-mono opacity-50 w-4 text-center">{i}</div>
                                    <input
                                        className="input input-xs input-bordered flex-1 font-mono"
                                        value={c}
                                        onChange={(e) => updateCase(i, e.target.value)}
                                        placeholder={`Case Value`}
                                    />
                                    <button className="btn btn-xs btn-ghost btn-square text-error opacity-50 hover:opacity-100" onClick={() => removeCase(i)}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-xs btn-outline btn-dashed w-full gap-2 opacity-60 hover:opacity-100" onClick={addCase}>
                            <Plus size={12} /> Add Case
                        </button>
                    </div>
                );
            }

            return (
                <div className="form-control w-full h-[300px]">
                    {commonLabel}
                    <div className="h-full border border-base-300 rounded-lg overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage={param.language || 'json'}
                            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? (param.language ? '' : '{}'))}
                            onChange={(val) => onChange(param.key, val)}
                            options={{
                                minimap: { enabled: false },
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                fontFamily: "'JetBrains Mono', monospace",
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

interface WorkflowViewProps {
    tab: WorkflowTab;
    onContentChange?: (content: string) => void;
    onRun?: () => void;
    isExecuting?: boolean;
    executionState?: any[];
}

function WorkflowViewInner({ tab, onContentChange, onRun, isExecuting = false, executionState = EMPTY_ARRAY }: WorkflowViewProps) {
    const { theme } = useAppStore();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
    const [expressionModes, setExpressionModes] = useState<Record<string, boolean>>({});
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [newVarKey, setNewVarKey] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<{
        sourceNodeId?: string;
        sourceHandleId?: string;
    } | null>(null);

    const [graphContextMenu, setGraphContextMenu] = useState<{
        type: 'node' | 'edge' | 'pane';
        x: number;
        y: number;
        id?: string;
        data?: any;
    } | null>(null);

    const connectingNodeId = useRef<string | null>(null);
    const connectingHandleId = useRef<string | null>(null);

    const workflowData = useMemo(() => {
        try { return JSON.parse(tab.content); } catch { return { nodes: {}, edges: [], variables: {} }; }
    }, [tab.id, tab.content]);

    // Open inspector automatically when execution starts
    useEffect(() => {
        if (isExecuting) {
            setIsInspectorOpen(true);
        }
    }, [isExecuting]);

    const initialNodes: Node[] = useMemo(() => {
        const nodesMap = workflowData.nodes || {};
        const nodeList = Object.values(nodesMap).map((n: any) => {
            const def = getNodeDef(n.type);
            let subtitle = '';
            if (n.config) {
                const entries = Object.entries(n.config).slice(0, 2);
                subtitle = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
            }

            const executedStep = executionState.find(s => s.nodeId === n.id);
            let status = undefined;
            if (executedStep) {
                status = 'success';
                // Find last status if multiple steps?
                // executionState is ordered list. Last one wins?
                // Actually if any error, show error.
            }

            // Check if currently running (last step is running and this is it)
            if (isExecuting) {
                // Logic to determine if *this* node is running could be complex without granular events
                // For now, if status is 'running' in step
            }

            // Find specific step for this node
            const steps = executionState.filter(s => s.nodeId === n.id);
            if (steps.length > 0) {
                const lastStep = steps[steps.length - 1];
                status = lastStep.status;
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
                    disabled: n.disabled || false,
                },
            };
        });
        return nodeList;
    }, [workflowData, executionState, isExecuting]);

    const initialEdges: Edge[] = useMemo(() => {
        const edgeArr = workflowData.edges || [];
        const completedNodes = new Map<string, string>();
        executionState.forEach(step => {
            completedNodes.set(step.nodeId, step.signal);
        });

        return edgeArr.map((e: any) => {
            const { stroke, strokeWidth } = e.style || {};

            const sourceSignal = completedNodes.get(e.fromNodeId || e.source);
            const edgeSignal = e.signal || 'success';

            const isTraversed = sourceSignal && (
                sourceSignal === edgeSignal ||
                (edgeSignal === 'success' && sourceSignal === 'success')
            );

            let edgeColor = stroke || '#9ca3af'; // Gray-400
            let animated = isExecuting;
            let label = e.signal || 'success';

            if (isTraversed) {
                if (e.signal === 'false') edgeColor = '#ef4444'; // Red for false
                else edgeColor = '#22c55e'; // Green for true/success
                animated = false;
                if (label === 'success') label = '1 item'; // Mock count
            } else if (isExecuting) {
                edgeColor = '#ff6d5a';
            }

            return {
                id: e.id,
                source: e.fromNodeId || e.source,
                target: e.toNodeId || e.target,
                sourceHandle: e.signal || 'success',
                label: label,
                type: 'hover',
                animated: animated,
                className: isExecuting || isTraversed ? 'n8n-flow-active' : '',
                style: {
                    stroke: edgeColor,
                    strokeWidth: isTraversed ? 3 : (strokeWidth || 2)
                },
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: edgeColor },
                interactionWidth: 20,
                selectable: true,
                updatable: true,
            };
        });
    }, [workflowData, isExecuting, executionState]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        const handleQuickAdd = (e: any) => {
            setIsSidebarOpen(true);
            setPendingConnection({
                sourceNodeId: e.detail.sourceNodeId,
                sourceHandleId: e.detail.sourceHandleId
            });
        };
        const handleNodeDelete = (e: any) => {
            const { nodeId } = e.detail;
            setNodes(nds => nds.filter(n => n.id !== nodeId));
            setEdges(eds => eds.filter(ed => ed.source !== nodeId && ed.target !== nodeId));
            if (selectedNode?.id === nodeId) setSelectedNode(null);
        };
        const handleNodeToggle = (e: any) => {
            const { nodeId, disabled } = e.detail;
            setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, disabled } } : n));
        };
        const handleNodeExecute = (_: any) => {
            // const { nodeId } = e.detail;
            // Execute node logic here
        };
        const handleContextMenu = (e: any) => {
            const { type, x, y, id, data } = e.detail;
            setGraphContextMenu({ type, x, y, id, data });
        };

        window.addEventListener('workflow-quick-add', handleQuickAdd);
        window.addEventListener('workflow-node-delete', handleNodeDelete);
        window.addEventListener('workflow-node-toggle', handleNodeToggle);
        window.addEventListener('workflow-node-execute', handleNodeExecute);
        window.addEventListener('workflow-context-menu', handleContextMenu);

        return () => {
            window.removeEventListener('workflow-quick-add', handleQuickAdd);
            window.removeEventListener('workflow-node-delete', handleNodeDelete);
            window.removeEventListener('workflow-node-toggle', handleNodeToggle);
            window.removeEventListener('workflow-node-execute', handleNodeExecute);
            window.removeEventListener('workflow-context-menu', handleContextMenu);
        };
    }, [selectedNode, setNodes, setEdges]);

    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [workflowData, setNodes, setEdges, executionState, isExecuting]);

    useEffect(() => {
        if (!nodes || !edges) return;

        const nodesMap: Record<string, any> = {};
        nodes.forEach(n => {
            nodesMap[n.id] = {
                id: n.id,
                name: (n.data as any).label || '',
                type: n.type || 'click',
                config: (n.data as any).config || {},
                x: Math.round(n.position.x),
                y: Math.round(n.position.y),
                style: { width: n.width, height: n.height, ...n.style },
                disabled: (n.data as any).disabled,
            };
        });
        const edgeArr = edges.map(e => ({
            id: e.id, fromNodeId: e.source, toNodeId: e.target,
            signal: e.sourceHandle || String(e.label || 'success'),
        }));

        const updated = { ...workflowData, nodes: nodesMap, edges: edgeArr };
        const json = JSON.stringify(updated, null, 2);

        if (json !== tab.content) {
            isInternalUpdate.current = true;
            if (onContentChange) onContentChange(json);
        }
    }, [nodes, edges]);

    useEffect(() => {
        const handleEdgeDelete = (e: any) => {
            setEdges(eds => eds.filter(edge => edge.id !== e.detail.edgeId));
        };
        const handleEdgeInsert = (e: any) => {
            const { edgeId } = e.detail;
            const edge = edges.find(ed => ed.id === edgeId);
            if (!edge) return;
            setIsSidebarOpen(true);
            setPendingConnection({
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
            style: { strokeWidth: 2, stroke: '#9ca3af' },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#9ca3af' },
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
            setIsSidebarOpen(true);
            setPendingConnection({
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

    const addConnectedNode = useCallback((nodeType: string) => {
        const def = getNodeDef(nodeType);
        const newNodeId = uuidv4();

        let x = 0, y = 0;
        if (pendingConnection?.sourceNodeId) {
            const sourceNode = nodes.find(n => n.id === pendingConnection.sourceNodeId);
            if (sourceNode) {
                x = sourceNode.position.x + 300;
                y = sourceNode.position.y;
            }
        } else {
            x = 100;
            y = 100;
        }

        const newNode: Node = {
            id: newNodeId,
            type: nodeType,
            position: { x, y },
            data: { label: def?.label || 'Node', nodeType, config: {}, subtitle: '' },
        };
        setNodes((nds) => nds.concat(newNode));

        if (pendingConnection?.sourceNodeId) {
            setEdges((eds) => addEdge({
                id: uuidv4(),
                source: pendingConnection.sourceNodeId,
                target: newNodeId,
                sourceHandle: pendingConnection.sourceHandleId,
                label: pendingConnection.sourceHandleId === 'false' ? 'false' : 'success',
                ...DEFAULT_EDGE_OPTIONS
            } as any, eds));
        }

        setPendingConnection(null);
        setIsSidebarOpen(false);
    }, [setNodes, setEdges, nodes, pendingConnection]);

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

    const selectedNodeDef = selectedNode ? getNodeDef(selectedNode.type || '') : null;
    const vars = getVars();
    const varEntries = Object.entries(vars);

    return (
        <div className="flex-1 flex h-full bg-base-100 overflow-hidden">
            {tab.viewMode === 'graph' ? (
                <div className="flex-1 flex relative">
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
                            connectionLineType={ConnectionLineType.Bezier}
                            connectionLineStyle={{ stroke: '#b1b1b7', strokeWidth: 2 }}
                        >
                            <Background gap={20} size={1} color="#d4d4d8" variant={BackgroundVariant.Dots} style={{ backgroundColor: '#f5f5f5' }} />

                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
                                {onRun && (
                                    <button
                                        className={clsx(
                                            "btn btn-lg text-white border-none shadow-xl rounded-full px-8 gap-3 animate-in fade-in slide-in-from-bottom duration-300 group transition-all",
                                            isExecuting ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:bg-primary-focus"
                                        )}
                                        disabled={isExecuting}
                                        onClick={onRun}
                                    >
                                        {isExecuting ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />}
                                        <span className="font-bold tracking-tight">{isExecuting ? 'Executing...' : 'Execute workflow'}</span>
                                    </button>
                                )}
                            </div>

                            {/* n8n Style Right Toolbar (Add/Vars) */}
                            <div className="absolute top-20 right-4 z-10 flex flex-col gap-3">
                                <div className="flex flex-col bg-white shadow-lg rounded-xl border border-gray-100 p-1.5 space-y-1">
                                    <button
                                        className="p-2.5 hover:bg-gray-100 text-gray-700 transition-colors rounded-lg tooltip tooltip-left flex items-center justify-center"
                                        data-tip="Add node"
                                        onClick={() => {
                                            setPendingConnection(null);
                                            setIsSidebarOpen(true);
                                        }}
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <button
                                        className="p-2.5 hover:bg-gray-100 text-gray-700 transition-colors rounded-lg tooltip tooltip-left flex items-center justify-center"
                                        data-tip="Search"
                                    >
                                        <Search size={20} />
                                    </button>
                                    <div className="h-px bg-gray-100 w-full my-1" />
                                    <button
                                        className="p-2.5 hover:bg-gray-100 text-gray-700 transition-colors rounded-lg tooltip tooltip-left flex items-center justify-center"
                                        data-tip="Variables"
                                        onClick={() => setShowRightPanel(!showRightPanel)}
                                    >
                                        <Braces size={20} className={showRightPanel ? "text-primary" : ""} />
                                    </button>
                                </div>
                            </div>

                            {/* Zoom Controls (Bottom Left) */}
                            <div className="absolute bottom-16 left-8 z-10 flex gap-2">
                                <div className="flex items-center bg-white shadow-lg rounded-xl border border-gray-100 p-1">
                                    <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg" onClick={() => fitView()} title="Fit View"><Maximize size={18} /></button>
                                    <div className="w-px h-4 bg-gray-200 mx-1" />
                                    <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg" onClick={() => zoomOut()}><ZoomOut size={18} /></button>
                                    <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg" onClick={() => zoomIn()}><ZoomIn size={18} /></button>
                                </div>
                            </div>

                            {/* n8n Style Center Empty State */}
                            {nodes.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div className="flex items-center gap-8 pointer-events-auto animate-in fade-in zoom-in duration-300">
                                        <button
                                            className="flex flex-col items-center gap-4 group w-[140px] h-[140px] justify-center rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all"
                                            onClick={() => {
                                                setPendingConnection(null);
                                                setIsSidebarOpen(true);
                                            }}
                                        >
                                            <Plus size={32} className="text-gray-300 group-hover:text-primary transition-colors" />
                                            <span className="font-bold text-sm text-gray-400 group-hover:text-primary transition-colors">
                                                Add first step...
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                onAddNode={() => {
                                    setPendingConnection(null);
                                    setIsSidebarOpen(true);
                                    setGraphContextMenu(null);
                                }}
                            />
                        )}

                        <WorkflowSidebar
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            onAddNode={addConnectedNode}
                        />

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
                                nodes={nodes}
                                executionState={executionState}
                            />
                        )}

                        {/* Execution Inspector */}
                        <ExecutionInspector
                            isOpen={isInspectorOpen}
                            onClose={() => setIsInspectorOpen(false)}
                            executionState={executionState}
                            selectedNodeId={selectedNode?.id}
                            onSelectNode={(id) => {
                                const node = nodes.find(n => n.id === id);
                                if (node) {
                                    setSelectedNode(node);
                                    fitView({ nodes: [node], duration: 500 });
                                }
                            }}
                            onClear={() => { /* Handle clear if needed */ }}
                        />
                    </div>

                    {showRightPanel && (
                        <div className="w-80 border-l border-base-300 bg-base-200/50 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
                            <div className="flex items-center justify-between border-b border-base-300 shrink-0 p-3 bg-base-100/50">
                                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-warning">
                                    <Braces size={14} />
                                    Workflow Variables
                                    {varEntries.length > 0 && <span className="badge badge-xs badge-warning">{varEntries.length}</span>}
                                </div>
                                <button className="btn btn-xs btn-ghost btn-square" onClick={() => setShowRightPanel(false)}><X size={14} /></button>
                            </div>

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
