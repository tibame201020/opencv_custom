import React, { useState, useRef, useEffect } from 'react';
import { Braces, Search } from 'lucide-react';
import clsx from 'clsx';

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

    // Prepare data for picker
    // For now, list all other nodes. 
    
    // Group execution results by node
    const nodeResults = new Map<string, any>();
    executionState.forEach(step => {
        nodeResults.set(step.nodeId, step.output);
    });

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
                        {nodes.map(node => {
                            const result = nodeResults.get(node.id);
                            const nodeLabel = (node.data as any).label || node.id;

                            // Flatten all outputs for easy picking
                            let outputKeys: string[] = [];
                            let previewValues: Record<string, string> = {};

                            if (result && typeof result === 'object') {
                                Object.entries(result).forEach(([, items]: [string, any]) => {
                                    if (Array.isArray(items) && items.length > 0) {
                                        const firstItem = items[0].json || items[0];
                                        if (typeof firstItem === 'object' && firstItem !== null) {
                                            Object.keys(firstItem).forEach(key => {
                                                outputKeys.push(key);
                                                const val = firstItem[key];
                                                previewValues[key] = typeof val === 'object' ? 'Object' : String(val);
                                            });
                                        }
                                    }
                                });
                            }

                            // Deduplicate keys
                            outputKeys = Array.from(new Set(outputKeys));

                            return (
                                <div key={node.id} className="collapse collapse-arrow rounded-none border-b border-base-200">
                                    <input type="checkbox" className="min-h-0 py-0" /> 
                                    <div className="collapse-title min-h-0 py-2 px-3 text-xs flex items-center gap-2 hover:bg-base-200" style={{ minHeight: '32px' }}>
                                        <div className={clsx("w-2 h-2 rounded-full shrink-0", result ? "bg-success" : "bg-base-300")} />
                                        <span className="truncate flex-1 font-bold">{nodeLabel}</span>
                                    </div>
                                    <div className="collapse-content px-0 pb-0">
                                        <div className="pl-4 pr-1 py-1 space-y-0.5 bg-base-50">
                                            {outputKeys.length > 0 ? (
                                                outputKeys.map(key => (
                                                    <button 
                                                        key={key}
                                                        className="w-full text-left px-2 py-1.5 hover:bg-white hover:shadow-sm rounded transition-all group"
                                                        onClick={() => insertVariable(`$node["${nodeLabel}"].json.${key}`)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-mono text-primary font-bold">{key}</span>
                                                            <span className="text-[9px] text-base-content/40 truncate italic max-w-[100px]">
                                                                {previewValues[key]}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-[9px] opacity-40 italic">No output items found</div>
                                            )}
                                             <button 
                                                className="w-full text-left px-2 py-1.5 hover:bg-white hover:shadow-sm rounded transition-all opacity-40 hover:opacity-100 flex items-center justify-between"
                                                onClick={() => insertVariable(`$node["${nodeLabel}"].json`)}
                                            >
                                                <span className="text-[10px] font-mono">(Whole JSON)</span>
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
