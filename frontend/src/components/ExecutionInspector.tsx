import React, { useState, useMemo } from 'react';
import {
    X, Check, Clock, Database,
    RotateCcw,
    Search, Maximize2, Minimize2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import { useAppStore } from '../store';
import { getNodeDef } from '../workflow/nodeRegistry';

export interface ExecutionStep {
    nodeId: string;
    status: 'success' | 'error' | 'running';
    input?: any;
    output?: any;
    error?: any;
    startTime?: string;
    endTime?: string;
    duration?: number;
    nodeName?: string; // Optional, if backend sends it
    nodeType?: string; // Optional, to resolve icon
}

interface ExecutionInspectorProps {
    isOpen: boolean;
    onClose: () => void;
    executionState: ExecutionStep[];
    selectedNodeId?: string | null;
    onSelectNode: (nodeId: string) => void;
    onClear: () => void;
}

export const ExecutionInspector: React.FC<ExecutionInspectorProps> = ({
    isOpen, onClose, executionState, selectedNodeId, onSelectNode, onClear
}) => {
    const { theme } = useAppStore();
    const [activeTab, setActiveTab] = useState<'input' | 'output'>('output');
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter steps based on search
    const filteredSteps = useMemo(() => {
        if (!searchTerm) return executionState;
        return executionState.filter(step =>
            step.nodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (step.nodeName && step.nodeName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [executionState, searchTerm]);

    // Find selected step object
    const selectedStep = useMemo(() =>
        executionState.find(s => s.nodeId === selectedNodeId) || executionState[executionState.length - 1],
    [executionState, selectedNodeId]);

    if (!isOpen && executionState.length === 0) return null;

    const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

    return (
        <div
            className={clsx(
                "absolute bottom-0 left-0 right-0 z-40 flex flex-col bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out",
                isOpen ? (isExpanded ? "h-[80vh]" : "h-[350px]") : "h-[40px]"
            )}
        >
            {/* Header Bar */}
            <div
                className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0 h-10 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => !isOpen && onClose()} // If closed, clicking header opens it. If open, do nothing (handled by buttons)
            >
                <div className="flex items-center gap-3">
                    <div className={clsx("w-2.5 h-2.5 rounded-full", executionState.some(s => s.status === 'running') ? "bg-orange-500 animate-pulse" : "bg-green-500")} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Execution Inspector
                    </span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {executionState.length} steps
                    </span>
                </div>

                <div className="flex items-center gap-1">
                     {isOpen && (
                        <>
                            <button
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                title="Clear Logs"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button
                                className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                title={isExpanded ? "Minimize Height" : "Maximize Height"}
                            >
                                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                        </>
                    )}
                    <button
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        {isOpen ? <X size={16} /> : <span className="text-xs font-bold text-primary">Show</span>}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isOpen && (
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANE: Execution List */}
                    <div className="w-[280px] flex flex-col border-r border-gray-200 bg-gray-50/30 shrink-0">
                        {/* Search Bar */}
                        <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search steps..."
                                    className="input input-xs input-bordered w-full pl-7 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredSteps.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs">
                                    No steps found.
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {filteredSteps.map((step, index) => {
                                        const def = getNodeDef(step.nodeType || 'click');
                                        const IconComp = def?.icon;
                                        const isSelected = selectedStep?.nodeId === step.nodeId;

                                        return (
                                            <div
                                                key={`${step.nodeId}-${index}`}
                                                className={clsx(
                                                    "group flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 cursor-pointer transition-all",
                                                    isSelected ? "bg-white border-l-[3px] border-l-primary shadow-sm" : "border-l-[3px] border-l-transparent hover:bg-gray-100 text-gray-600"
                                                )}
                                                onClick={() => onSelectNode(step.nodeId)}
                                            >
                                                {/* Status Icon */}
                                                <div className={clsx(
                                                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border",
                                                    step.status === 'success' ? "bg-green-50 border-green-100 text-green-600" :
                                                    step.status === 'error' ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"
                                                )}>
                                                    {step.status === 'success' ? <Check size={12} strokeWidth={3} /> :
                                                     step.status === 'error' ? <X size={12} strokeWidth={3} /> :
                                                     <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className={clsx("text-xs font-bold truncate", isSelected ? "text-gray-900" : "text-gray-700")}>
                                                        {step.nodeName || step.nodeId}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100/50 px-1 rounded">
                                                            {IconComp && <IconComp size={10} className="opacity-70" />}
                                                            <span>{def?.label || 'Node'}</span>
                                                        </div>
                                                        {step.duration !== undefined && (
                                                            <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                                                <Clock size={8} /> {step.duration}ms
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANE: Data Preview */}
                    <div className="flex-1 flex flex-col bg-white min-w-0">
                        {selectedStep ? (
                            <>
                                {/* Toolbar */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-bold text-gray-700">Data View</div>
                                        <div className="h-4 w-px bg-gray-200" />

                                        {/* Tabs */}
                                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                            <button
                                                className={clsx(
                                                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                                                    activeTab === 'input' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                                                )}
                                                onClick={() => setActiveTab('input')}
                                            >
                                                Input
                                            </button>
                                            <button
                                                className={clsx(
                                                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                                                    activeTab === 'output' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                                                )}
                                                onClick={() => setActiveTab('output')}
                                            >
                                                Output
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {selectedStep.nodeId}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 relative bg-gray-50/20">
                                    {(() => {
                                        const data = activeTab === 'input' ? selectedStep.input : selectedStep.output;
                                        const isEmpty = data === undefined || data === null || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0);

                                        if (isEmpty) {
                                            return (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                                                    <Database size={40} className="mb-3 opacity-20" />
                                                    <span className="text-xs font-medium opacity-60">No {activeTab} data available</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <Editor
                                                height="100%"
                                                defaultLanguage="json"
                                                value={JSON.stringify(data, null, 2)}
                                                options={{
                                                    readOnly: true,
                                                    minimap: { enabled: false },
                                                    fontSize: 12,
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    scrollBeyondLastLine: false,
                                                    lineNumbers: 'on',
                                                    renderLineHighlight: 'none',
                                                    folding: true,
                                                }}
                                                theme={monacoTheme}
                                            />
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                    <Database size={24} className="opacity-30" />
                                </div>
                                <span className="text-sm font-medium opacity-50">Select a step to inspect data</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
