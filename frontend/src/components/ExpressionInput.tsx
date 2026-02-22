import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Braces, Search } from 'lucide-react';
import { getNodeDef } from '../workflow/nodeRegistry';

interface ExpressionInputProps {
    value: string;
    onChange: (value: string) => void;
    nodes: any[];
    executionState: any[];
    placeholder?: string;
}

export const ExpressionInput: React.FC<ExpressionInputProps> = ({ value, onChange, nodes, executionState, placeholder }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const insertVariable = (variable: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        const newValue = `${before}{{ ${variable} }}${after}`;
        onChange(newValue);
        setShowPicker(false);
        
        // Restore focus?
        setTimeout(() => textarea.focus(), 0);
    };

    // Prepare data for picker: Merge Execution State (Truth) with Static Schema (Plan)
    const nodeDataMap = useMemo(() => {
        const map = new Map<string, { label: string, data: any, isStatic: boolean }>();

        // 1. Fill from Nodes (Static Schema)
        nodes.forEach(node => {
            const def = getNodeDef(node.type || (node.data as any).nodeType);
            const staticData: Record<string, string> = {};

            // Build dummy object from outputs
            if (def && def.outputs) {
                def.outputs.forEach(out => {
                    staticData[out.key] = `(${out.type})`;
                });
            }

            map.set(node.id, {
                label: (node.data as any).label || def?.label || 'Node',
                data: staticData,
                isStatic: true
            });
        });

        // 2. Override with Execution Data (Runtime Truth)
        executionState.forEach(step => {
            if (map.has(step.nodeId)) {
                const entry = map.get(step.nodeId)!;
                // Merge or replace? Execution data usually has { success: [...items] } or just the fields?
                // The engine returns { output: { success: [Item] } } or similar structure.
                // But `step.output` in `WorkflowView` logic seems to be map[string]ExecutionData.
                // We need to flatten it for the picker.

                // If the output has 'success', take the first item's JSON
                let runtimeData = step.output;
                if (runtimeData && runtimeData['success'] && runtimeData['success'].length > 0) {
                    runtimeData = runtimeData['success'][0].json;
                } else if (runtimeData && Object.keys(runtimeData).length > 0) {
                    // Fallback: take first available output
                    const firstKey = Object.keys(runtimeData)[0];
                    if (runtimeData[firstKey] && runtimeData[firstKey].length > 0) {
                        runtimeData = runtimeData[firstKey][0].json;
                    }
                }

                if (runtimeData) {
                    map.set(step.nodeId, {
                        ...entry,
                        data: runtimeData,
                        isStatic: false
                    });
                }
            }
        });

        return map;
    }, [nodes, executionState]);

    return (
        <div className="relative w-full">
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    className="textarea textarea-bordered textarea-xs w-full font-mono text-[11px] leading-tight min-h-[60px] pr-8 bg-base-100"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || '{{ $json.field }}'}
                />
                <button 
                    className="absolute top-1 right-1 btn btn-xs btn-ghost btn-square text-primary opacity-50 hover:opacity-100"
                    onClick={() => setShowPicker(!showPicker)}
                    title="Insert Variable"
                >
                    <Braces size={14} />
                </button>
            </div>

            {/* Variable Picker Popover */}
            {showPicker && (
                <div 
                    ref={pickerRef}
                    className="absolute top-full right-0 mt-1 w-64 bg-base-100 border border-base-300 shadow-xl rounded-xl z-[100] flex flex-col max-h-[300px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                    <div className="p-2 border-b border-base-300 bg-base-200/50 flex gap-2 items-center">
                        <Search size={12} className="opacity-40" />
                        <input 
                            type="text" 
                            className="bg-transparent text-xs outline-none flex-1 placeholder:opacity-40" 
                            placeholder="Search variables..." 
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-40 px-2 py-1">Global</div>
                        <button 
                            className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 rounded flex items-center gap-2 font-mono text-warning"
                            onClick={() => insertVariable('$vars.key')}
                        >
                            $vars...
                        </button>
                         <button 
                            className="w-full text-left px-2 py-1 text-xs hover:bg-primary/10 rounded flex items-center gap-2 font-mono text-success"
                            onClick={() => insertVariable('$json.key')}
                        >
                            $json...
                        </button>

                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-40 px-2 py-1 mt-2">Nodes</div>
                        {Array.from(nodeDataMap.entries()).map(([nodeId, entry]) => {
                            // Filter by search
                            if (search && !entry.label.toLowerCase().includes(search.toLowerCase())) return null;

                            const keys = entry.data && typeof entry.data === 'object' ? Object.keys(entry.data) : [];
                            const isEmpty = keys.length === 0;

                            return (
                                <div key={nodeId} className="collapse collapse-arrow rounded-none">
                                    <input type="checkbox" className="min-h-0 py-0" /> 
                                    <div className="collapse-title min-h-0 py-1 px-2 text-xs flex items-center gap-2 hover:bg-base-200" style={{ minHeight: '24px' }}>
                                        <span className={entry.isStatic ? "text-base-content/70 italic" : "text-base-content"}>
                                            {entry.label} {entry.isStatic && "*"}
                                        </span>
                                    </div>
                                    <div className="collapse-content px-0 pb-0">
                                        <div className="pl-2 space-y-0.5 border-l-2 border-base-200 ml-2 my-1">
                                            {!isEmpty ? (
                                                keys.map(key => (
                                                    <button 
                                                        key={key}
                                                        className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-primary/10 rounded font-mono truncate flex justify-between group"
                                                        onClick={() => insertVariable(`$node["${entry.label}"].json.${key}`)}
                                                    >
                                                        <span>{key}</span>
                                                        {entry.isStatic && <span className="opacity-30 text-[9px] group-hover:opacity-100">{entry.data[key]}</span>}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-2 py-1 text-[9px] opacity-40 italic">No output data</div>
                                            )}
                                             <button 
                                                className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-primary/10 rounded font-mono truncate opacity-50"
                                                onClick={() => insertVariable(`$node["${entry.label}"].json`)}
                                            >
                                                (Whole JSON)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
