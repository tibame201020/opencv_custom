import React, { useState, useEffect } from 'react';
import {
    X, Check, Clock, Database,
    ArrowRight, ChevronRight, RotateCcw,
    Table, Code
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import { useAppStore } from '../store';

interface ExecutionStep {
    nodeId: string;
    status: 'success' | 'error' | 'running';
    input?: any;
    output?: any;
    error?: any;
    startTime?: string; // ISO string
    endTime?: string; // ISO string
    duration?: number; // milliseconds
}

interface ExecutionResultsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    executionState: ExecutionStep[];
    logs: any[];
    isRunning: boolean;
    runId?: string;
    onClear: () => void;
}

export const ExecutionResultsPanel: React.FC<ExecutionResultsPanelProps> = ({
    isOpen, onClose, executionState, logs, isRunning, runId, onClear
}) => {
    const { theme } = useAppStore();
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'json' | 'table'>('json');
    const [activeTab, setActiveTab] = useState<'input' | 'output'>('output');

    // Auto-select the last step when execution updates, unless user has manually selected one
    useEffect(() => {
        if (executionState.length > 0 && !selectedStepId) {
             // Or maybe we want to select the last one?
             // setSelectedStepId(executionState[executionState.length - 1].nodeId);
        }
    }, [executionState, selectedStepId]);

    const selectedStep = executionState.find(s => s.nodeId === selectedStepId) || executionState[executionState.length - 1];

    if (!isOpen && executionState.length === 0 && logs.length === 0) return null;

    const monacoTheme = theme === 'dark' || theme === 'dracula' || theme === 'black' ? 'vs-dark' : 'light';

    return (
        <div className="absolute bottom-0 left-0 right-0 z-40 flex flex-col bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300"
             style={{ height: isOpen ? '350px' : '40px' }}>

            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 shrink-0 h-10 cursor-pointer"
                 onClick={onClose}>
                <div className="flex items-center gap-3">
                    <div className={clsx("w-2.5 h-2.5 rounded-full", isRunning ? "bg-orange-500 animate-pulse" : "bg-green-500")} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Execution Inspector
                    </span>
                    {runId && (
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 rounded">
                            {runId}
                        </span>
                    )}
                    {executionState.length > 0 && (
                        <span className="text-xs text-gray-400">
                            • {executionState.length} steps
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        title="Clear Execution Data"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        {isOpen ? <X size={16} /> : <span className="text-xs font-bold">Show</span>}
                    </button>
                </div>
            </div>

            {/* Main Content (Split View) */}
            {isOpen && (
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANE: Execution List */}
                    <div className="w-[300px] flex flex-col border-r border-gray-200 bg-gray-50/50">
                        <div className="px-3 py-2 text-[10px] font-bold uppercase text-gray-400 border-b border-gray-200 bg-gray-100/50">
                            Execution Steps
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {executionState.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-xs italic">
                                    No steps executed yet.
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {executionState.map((step, index) => {
                                        // Retrieve node definition to show icon/name if available (requires access to node definitions or store)
                                        // Since we only have nodeId, we might need to look it up or just show ID.
                                        // For now, we'll try to use a generic look.
                                        const isSelected = selectedStep?.nodeId === step.nodeId;
                                        return (
                                            <div
                                                key={`${step.nodeId}-${index}`}
                                                className={clsx(
                                                    "flex items-center gap-3 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors",
                                                    isSelected ? "bg-white border-l-4 border-l-primary shadow-sm" : "border-l-4 border-l-transparent text-gray-600"
                                                )}
                                                onClick={() => setSelectedStepId(step.nodeId)}
                                            >
                                                <div className={clsx(
                                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                                    step.status === 'success' ? "bg-green-100 text-green-600" :
                                                    step.status === 'error' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                                )}>
                                                    {step.status === 'success' ? <Check size={12} strokeWidth={3} /> :
                                                     step.status === 'error' ? <X size={12} strokeWidth={3} /> :
                                                     <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold truncate">
                                                        {/* Ideally we map ID to Name here. For now ID. */}
                                                        Node {step.nodeId.substring(0, 8)}...
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {step.duration !== undefined && (
                                                            <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                                                <Clock size={8} /> {step.duration}ms
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded">
                                                            item 0
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className={clsx("text-gray-300", isSelected && "text-primary")} />
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
                                {/* Node Header Info */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-gray-800">
                                            Execution Data
                                        </h3>
                                        <span className={clsx(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                            selectedStep.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {selectedStep.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                        <button
                                            className={clsx(
                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                activeTab === 'input' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                            onClick={() => setActiveTab('input')}
                                        >
                                            Input
                                        </button>
                                        <button
                                            className={clsx(
                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                activeTab === 'output' ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                            onClick={() => setActiveTab('output')}
                                        >
                                            Output
                                        </button>
                                    </div>

                                    {/* View Mode Toggle */}
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <button
                                            className={clsx("p-1 rounded hover:bg-gray-100", viewMode === 'table' && "text-primary bg-primary/5")}
                                            onClick={() => setViewMode('table')}
                                            title="Table View"
                                        >
                                            <Table size={14} />
                                        </button>
                                        <button
                                            className={clsx("p-1 rounded hover:bg-gray-100", viewMode === 'json' && "text-primary bg-primary/5")}
                                            onClick={() => setViewMode('json')}
                                            title="JSON View"
                                        >
                                            <Code size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Data Viewer */}
                                <div className="flex-1 overflow-hidden relative">
                                    {(() => {
                                        const data = activeTab === 'input' ? selectedStep.input : selectedStep.output;

                                        if (data === undefined || data === null) {
                                            return (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                                                    <Database size={32} className="mb-2 opacity-50" />
                                                    <span className="text-xs">No {activeTab} data available</span>
                                                </div>
                                            );
                                        }

                                        // Ensure data is array for table view, or just show JSON
                                        const isArray = Array.isArray(data);
                                        const displayData = isArray ? data : [data];
                                        const itemCount = displayData.length;

                                        return (
                                            <div className="h-full flex flex-col">
                                                <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 font-mono flex items-center gap-2">
                                                    <span className="bg-gray-200 px-1.5 rounded text-gray-600">{itemCount} items</span>
                                                    <span>{JSON.stringify(data).length} bytes</span>
                                                </div>

                                                <div className="flex-1 relative">
                                                    <Editor
                                                        height="100%"
                                                        defaultLanguage="json"
                                                        value={JSON.stringify(data, null, 2)}
                                                        options={{
                                                            readOnly: true,
                                                            minimap: { enabled: false },
                                                            fontSize: 12,
                                                            fontFamily: 'monospace',
                                                            scrollBeyondLastLine: false,
                                                            lineNumbers: 'on',
                                                            renderLineHighlight: 'none',
                                                        }}
                                                        theme={monacoTheme}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                                <ArrowRight size={32} className="mb-2 opacity-20" />
                                <span className="text-sm font-medium opacity-50">Select a step to view details</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
