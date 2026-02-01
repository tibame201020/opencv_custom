import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Plus, Upload, Trash2, Edit2, Search, Save, X } from 'lucide-react';
import { type Script } from '../store';
import clsx from 'clsx';

// Mock Scripts Data (Usually fetches from Backend)
const INITIAL_SCRIPTS: Script[] = [
    { id: 'robot', name: 'Robot Script (Desktop)', platform: 'desktop', description: 'Automates desktop GUI interactions' },
    { id: 'gear', name: 'Gear Script', platform: 'android', description: 'Farms gear in mobile game' },
    { id: 'evil_hunter', name: 'Evil Hunter', platform: 'android', description: 'Auto-combat script' },
];

export const ManagementView: React.FC = () => {
    const { t } = useTranslation();
    const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<Script | null>(null);

    // Filter
    const filtered = scripts.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingScript({ id: '', name: '', platform: 'desktop', description: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (script: Script) => {
        setEditingScript({ ...script });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm(t('ui.management.delete') + '?')) {
            setScripts(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleSave = () => {
        if (!editingScript) return;

        if (scripts.some(s => s.id === editingScript.id && editingScript.id !== '')) {
            // Update existing (Simple mock logic)
            setScripts(prev => prev.map(s => s.id === editingScript.id ? editingScript : s));
        } else {
            // Create new (Mock ID generation)
            const newScript = { ...editingScript, id: editingScript.id || `script_${Date.now()}` };
            setScripts(prev => [...prev, newScript]);
        }
        setIsModalOpen(false);
        setEditingScript(null);
    };

    return (
        <div className="flex flex-col h-full bg-base-100">
            {/* Toolbar */}
            <div className="navbar bg-base-200/50 border-b border-base-300 min-h-16 px-4 gap-4">
                <h2 className="text-lg font-bold mr-4">{t('ui.management.title')}</h2>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                    <input
                        type="text"
                        placeholder={t('ui.execution.searchData')}
                        className="input input-sm input-bordered w-full pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-none gap-2">
                    <button className="btn btn-sm btn-outline gap-2" title={t('ui.management.upload')}>
                        <Upload size={16} /> <span className="hidden sm:inline">{t('ui.management.upload')}</span>
                    </button>
                    <button className="btn btn-sm btn-primary gap-2" onClick={handleCreate}>
                        <Plus size={16} /> {t('ui.management.create')}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(script => (
                        <div key={script.id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow group">
                            <div className="card-body p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className={clsx(
                                        "badge badge-sm uppercase font-bold tracking-wider",
                                        script.platform === 'android' ? "badge-success text-success-content" : "badge-info text-info-content"
                                    )}>
                                        {script.platform}
                                    </div>
                                    <div className="dropdown dropdown-end">
                                        <button tabIndex={0} className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal size={16} />
                                        </button>
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200">
                                            <li><a onClick={() => handleEdit(script)}><Edit2 size={14} /> {t('ui.management.edit')}</a></li>
                                            <li><a className="text-error" onClick={() => handleDelete(script.id)}><Trash2 size={14} /> {t('ui.management.delete')}</a></li>
                                        </ul>
                                    </div>
                                </div>
                                <h3 className="card-title text-base">{script.name}</h3>
                                <p className="text-xs text-base-content/60 line-clamp-2 h-8">{script.description || "No description provided."}</p>
                                <div className="text-xs font-mono opacity-30 mt-4">{script.id}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Modal (Native Dialog or Absolute Overlay) */}
            {isModalOpen && editingScript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-200 scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="card-body">
                            <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
                                {editingScript.id ? t('ui.management.edit') : t('ui.management.create')}
                                <button onClick={() => setIsModalOpen(false)} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                            </h3>

                            <div className="form-control w-full">
                                <label className="label"><span className="label-text">Script Name</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editingScript.name}
                                    onChange={e => setEditingScript({ ...editingScript, name: e.target.value })}
                                />
                            </div>

                            <div className="form-control w-full mt-2">
                                <label className="label"><span className="label-text">Platform</span></label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingScript.platform}
                                    onChange={e => setEditingScript({ ...editingScript, platform: e.target.value as any })}
                                >
                                    <option value="desktop">Desktop (Windows/Linux)</option>
                                    <option value="android">Android (ADB)</option>
                                </select>
                            </div>

                            <div className="form-control w-full mt-2">
                                <label className="label"><span className="label-text">ID (Filename)</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full font-mono text-sm"
                                    value={editingScript.id}
                                    onChange={e => setEditingScript({ ...editingScript, id: e.target.value })}
                                    disabled={!!editingScript.id && scripts.some(s => s.id === editingScript.id)} // Disable if editing existing
                                    placeholder="e.g. daily_farm_v1"
                                />
                            </div>

                            <div className="modal-action mt-6">
                                <button className="btn" onClick={() => setIsModalOpen(false)}>{t('ui.management.cancel')}</button>
                                <button className="btn btn-primary gap-2" onClick={handleSave}>
                                    <Save size={16} /> {t('ui.management.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
