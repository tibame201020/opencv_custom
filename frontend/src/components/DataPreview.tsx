import React, { useState, useMemo } from 'react';
import { Table, FileJson, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import { useAppStore } from '../store';

interface DataPreviewProps {
    data: any[];
    title?: string;
    emptyMessage?: string;
    icon?: React.ReactNode;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
    data,
    title,
    emptyMessage = "No data available",
    icon
}) => {
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const { theme } = useAppStore();
    const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

    const isEmpty = !data || !Array.isArray(data) || data.length === 0;

    // Collect all unique keys for table headers
    const keys = useMemo(() => {
        if (isEmpty) return [];
        const keySet = new Set<string>();
        data.forEach(item => {
            const obj = item.json || item; // Handle wrapped vs unwrapped
            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(k => keySet.add(k));
            }
        });
        return Array.from(keySet).sort();
    }, [data, isEmpty]);

    return (
        <div className="flex flex-col h-full bg-base-50/50">
            {/* Header */}
            <div className="px-4 py-2 border-b border-base-200 bg-base-50 flex items-center justify-between shrink-0 h-10">
                <div className="flex items-center gap-2">
                    {icon}
                    {title && <span className="text-[11px] font-bold uppercase tracking-widest text-base-content/60">{title}</span>}
                    {!isEmpty && <span className="text-[10px] bg-base-200 px-1.5 py-0.5 rounded text-base-content/50">{data.length} items</span>}
                </div>
                {!isEmpty && (
                    <div className="flex bg-base-200/50 p-0.5 rounded-lg">
                        <button
                            className={clsx("p-1 rounded-md transition-all", viewMode === 'table' ? "bg-white shadow-sm text-primary" : "text-base-content/40 hover:text-base-content/70")}
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <Table size={12} />
                        </button>
                        <button
                            className={clsx("p-1 rounded-md transition-all", viewMode === 'json' ? "bg-white shadow-sm text-primary" : "text-base-content/40 hover:text-base-content/70")}
                            onClick={() => setViewMode('json')}
                            title="JSON View"
                        >
                            <FileJson size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-white">
                {isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-base-content/40">
                        <div className="w-12 h-12 bg-base-200 rounded-full flex items-center justify-center mb-3 opacity-50">
                            <Database size={20} />
                        </div>
                        <div className="text-sm font-medium text-base-content/60">No Data</div>
                        <div className="text-xs mt-1 opacity-60 leading-relaxed max-w-[200px]">{emptyMessage}</div>
                    </div>
                ) : (
                    viewMode === 'table' ? (
                        <div className="h-full overflow-auto custom-scrollbar">
                            <table className="table table-xs w-full">
                                <thead className="bg-base-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="w-8 text-center bg-base-100">#</th>
                                        {keys.map(k => <th key={k} className="bg-base-100 font-mono text-xs">{k}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, i) => {
                                        const valMap = item.json || item;
                                        return (
                                            <tr key={i} className="hover:bg-base-50 group">
                                                <td className="text-center font-mono text-base-content/30 group-hover:text-base-content/50">{i + 1}</td>
                                                {keys.map(k => {
                                                    const val = valMap[k];
                                                    const display = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
                                                    return (
                                                        <td key={k} className="font-mono text-xs max-w-[200px] truncate" title={display}>
                                                            {display}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={JSON.stringify(data, null, 2)}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                lineNumbers: 'on',
                                folding: true,
                                scrollBeyondLastLine: false,
                            }}
                            theme={monacoTheme}
                        />
                    )
                )}
            </div>
        </div>
    );
};
