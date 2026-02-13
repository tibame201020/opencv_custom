import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import clsx from 'clsx';
import {
    getNodesByCategory,
    CATEGORY_LABELS,
    CATEGORY_COLORS,
    type NodeCategory
} from '../workflow/nodeRegistry';

interface WorkflowSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNode: (type: string) => void;
}

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({ isOpen, onClose, onAddNode }) => {
    const [search, setSearch] = useState('');
    const categories = getNodesByCategory();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-base-100 border-l border-base-300 shadow-2xl z-[150] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-base-300 shrink-0">
                <div className="font-bold text-lg">Add Node</div>
                <button
                    onClick={onClose}
                    className="btn btn-sm btn-ghost btn-square text-base-content/50 hover:text-base-content"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-base-300 bg-base-200/30">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search nodes..."
                        className="input input-sm input-bordered w-full pl-9 pr-4 rounded-lg outline-none focus:border-primary/50 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {(Object.keys(categories) as NodeCategory[]).map(cat => {
                    const filteredNodes = categories[cat].filter(d =>
                        d.label.toLowerCase().includes(search.toLowerCase()) ||
                        d.description.toLowerCase().includes(search.toLowerCase())
                    );

                    if (filteredNodes.length === 0) return null;

                    return (
                        <div key={cat}>
                            <div className={clsx("text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2 px-1 flex items-center gap-2", CATEGORY_COLORS[cat])}>
                                <div className={clsx("w-1.5 h-1.5 rounded-full bg-current")} />
                                {CATEGORY_LABELS[cat]}
                            </div>
                            <div className="space-y-1">
                                {filteredNodes.map(def => {
                                    const IconComp = def.icon;
                                    return (
                                        <button
                                            key={def.type}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-base-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-left group border border-transparent hover:border-base-300 hover:shadow-sm"
                                            onClick={() => {
                                                onAddNode(def.type);
                                                // Don't close immediately if we want rapid adding?
                                                // Usually add node closes the menu.
                                                onClose();
                                            }}
                                        >
                                            <div className={clsx("w-9 h-9 flex items-center justify-center rounded-lg bg-base-200 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0", `text-${def.color}`)}>
                                                <IconComp size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-base-content/90 group-hover:text-primary transition-colors">{def.label}</div>
                                                <div className="text-[10px] text-base-content/50 mt-0.5 line-clamp-1">{def.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {Object.values(categories).flat().filter(d =>
                    d.label.toLowerCase().includes(search.toLowerCase()) ||
                    d.description.toLowerCase().includes(search.toLowerCase())
                ).length === 0 && (
                    <div className="text-center py-8 text-base-content/40 text-sm">
                        No nodes found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
};
