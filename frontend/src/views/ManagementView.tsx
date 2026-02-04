import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Upload, Trash2, Edit2, Search, Download } from 'lucide-react';
import { type Script } from '../store';
import clsx from 'clsx';
import { useAppStore } from '../store';

export const ManagementView: React.FC = () => {
    const { t } = useTranslation();
    const { apiBaseUrl } = useAppStore();
    const API_Base = apiBaseUrl;
    const [scripts, setScripts] = useState<Script[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [deletingScriptId, setDeletingScriptId] = useState<string | null>(null);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    const [newName, setNewName] = useState('');
    const [renameError, setRenameError] = useState<string | null>(null);

    // Import conflict states
    const [importConflictName, setImportConflictName] = useState<string | null>(null);
    const [pendingZipFile, setPendingZipFile] = useState<File | null>(null);
    const [importNewName, setImportNewName] = useState('');

    const fetchScripts = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_Base}/scripts`);
            setScripts(res.data);
        } catch (err) {
            console.error("Failed to fetch scripts", err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchScripts();
    }, []);

    const handleEdit = (script: Script) => {
        setEditingScript({ ...script });
        setNewName(script.name);
        setRenameError(null);
        setIsRenameModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${API_Base}/scripts/${id}`);
            fetchScripts();
            setDeletingScriptId(null);
        } catch (err) {
            console.error("Delete failed", err);
            // In a real app we'd use a toast, but for now let's just log
        }
    };

    const handleSaveRename = async () => {
        if (!editingScript || !newName || newName === editingScript.name) {
            setIsRenameModalOpen(false);
            return;
        }

        try {
            await axios.post(`${API_Base}/scripts/${editingScript.id}/rename`, {
                newName: newName
            });
            fetchScripts();
            setIsRenameModalOpen(false);
            setEditingScript(null);
            setRenameError(null);
        } catch (err: any) {
            if (err.response?.status === 409) {
                setRenameError(t('ui.management.nameConflict') || "A script with this name already exists.");
            } else {
                const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
                console.error("Rename failed", err);
                setRenameError(`Error: ${errorMsg}`);
            }
        }
    };

    const handleExport = (id: string) => {
        window.open(`${API_Base}/scripts/${id}/export`, "_blank");
    };

    const handleImport = async (file: File, requestedNewName?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        if (requestedNewName) {
            formData.append("newName", requestedNewName);
        }

        try {
            await axios.post(`${API_Base}/scripts/import`, formData);
            fetchScripts();
            setImportConflictName(null);
            setPendingZipFile(null);
            setImportNewName('');
        } catch (err: any) {
            if (err.response?.status === 409) {
                setImportConflictName(err.response.data.suggestedName || file.name.replace(".zip", ""));
                setPendingZipFile(file);
                setImportNewName(err.response.data.suggestedName + "_copy");
            } else {
                console.error("Import failed", err);
            }
        }
    };

    const filtered = scripts.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-base-100/50">
            {/* Professional Glass Header */}
            <div className="glass-header px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-inner">
                        <MoreHorizontal size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gradient">{t('ui.management.title')}</h1>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40 leading-none mt-1">
                            Library Infrastructure / {scripts.length} Total Scripts
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
                        <input
                            type="text"
                            placeholder={t('ui.management.search')}
                            className="input input-sm bg-base-300/30 border-none focus:ring-0 w-full md:w-64 pl-10 focus:bg-base-300/50 transition-all rounded-lg font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="h-4 w-[1px] bg-white/5 mx-2 hidden md:block" />

                    <label htmlFor="import-script" className="btn btn-sm btn-primary gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all px-4">
                        <Upload size={16} />
                        <span className="hidden sm:inline font-bold">{t('ui.management.upload')}</span>
                    </label>
                    <input
                        type="file"
                        id="import-script"
                        className="hidden"
                        accept=".zip"
                        value=""
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(file);
                        }}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="w-8 h-8 bg-primary/10 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest opacity-30">Synchronizing Data...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 border-2 border-dashed border-white/5 rounded-3xl bg-base-200/20 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-base-100/50 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                            <Search size={40} className="text-base-content/10" />
                        </div>
                        <h3 className="text-xl font-black">No Results Found</h3>
                        <p className="text-base-content/40 mt-1 max-w-xs text-center text-sm">Attempt to refine your persistent search parameters or upload a new asset module.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filtered.map(script => (
                            <div key={script.id} className="glass-card rounded-3xl p-6 hover-lift group relative overflow-hidden flex flex-col">
                                {/* Platform Status Dot */}
                                <div className="absolute top-0 right-0 p-1">
                                    <div className={clsx(
                                        "w-20 h-20 absolute -top-10 -right-10 blur-2xl opacity-10",
                                        script.platform === 'android' ? "bg-success" : "bg-info"
                                    )} />
                                </div>

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className={clsx(
                                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                                        script.platform === 'android' ? "bg-success/20 text-success" : "bg-info/20 text-info"
                                    )}>
                                        {script.platform}
                                    </div>
                                    <div className="flex items-center gap-1.5 backdrop-blur-md bg-white/5 p-1 rounded-xl border border-white/5">
                                        <button
                                            onClick={() => handleExport(script.id)}
                                            className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20 hover:text-primary transition-all p-0"
                                            title={t('ui.management.export')}
                                        >
                                            <Download size={14} />
                                        </button>

                                        {script.path?.startsWith('script/custom/') ? (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(script)}
                                                    className="btn btn-ghost btn-xs btn-circle hover:bg-info/20 hover:text-info transition-all p-0"
                                                    title={t('ui.management.rename')}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingScriptId(script.id)}
                                                    className="btn btn-ghost btn-xs btn-circle hover:bg-error/20 hover:text-error transition-all p-0"
                                                    title={t('ui.management.delete')}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-6 h-6 flex items-center justify-center opacity-20" title={t('ui.management.systemScript')}>
                                                <MoreHorizontal size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1 relative z-10 flex-1">
                                    <h3 className="text-lg font-black tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                                        {script.name}
                                    </h3>
                                    <p className="text-sm text-base-content/50 font-medium line-clamp-3 leading-relaxed">
                                        {script.description || "Experimental automation script module waiting for configuration parameters."}
                                    </p>
                                </div>

                                <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between relative z-10 font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center">
                                            <span className="text-[8px] font-black opacity-30 leading-none">ID</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-base-content/20 font-bold uppercase tracking-widest">{script.id}</span>
                                    </div>
                                    {!script.path?.startsWith('script/custom/') && (
                                        <span className="text-[8px] opacity-20 bg-white/5 px-2 py-0.5 rounded uppercase">{t('ui.management.systemScript')}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Premium Modals */}
            {isRenameModalOpen && editingScript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 premium-blur animate-in fade-in duration-300">
                    <div className="modal-box max-w-sm glass-card p-0 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
                            <h3 className="font-black text-xl flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                    <Edit2 size={16} />
                                </div>
                                {t('ui.management.renameScript')}
                            </h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-[11px] font-black uppercase tracking-widest opacity-40">Transformation Path</span>
                                </label>
                                <input
                                    type="text"
                                    className="input bg-base-300/30 border-white/5 focus:border-primary/50 w-full font-bold h-12"
                                    value={newName}
                                    onChange={e => {
                                        setNewName(e.target.value);
                                        if (renameError) setRenameError(null);
                                    }}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                                />
                                {renameError ? (
                                    <label className="label">
                                        <span className="label-text-alt text-error font-black uppercase tracking-tighter">{renameError}</span>
                                    </label>
                                ) : (
                                    <label className="label">
                                        <span className="label-text-alt opacity-30 text-[10px] font-medium">{t('ui.management.renameHelp')}</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="p-6 flex items-center justify-end gap-3 bg-base-300/20">
                            <button className="btn btn-ghost btn-sm font-black uppercase tracking-widest text-[11px]" onClick={() => setIsRenameModalOpen(false)}>
                                {t('ui.management.cancel')}
                            </button>
                            <button
                                className="btn btn-primary btn-sm px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                                onClick={handleSaveRename}
                                disabled={!newName || newName === editingScript.name}
                            >
                                {t('ui.management.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal Premium */}
            {deletingScriptId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 premium-blur animate-in fade-in duration-300">
                    <div className="modal-box max-w-sm glass-card p-0 overflow-hidden border-error/20 animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-error/10 bg-gradient-to-br from-error/10 to-transparent">
                            <h3 className="font-black text-xl text-error flex items-center gap-3">
                                <div className="w-8 h-8 bg-error/20 rounded-lg flex items-center justify-center">
                                    <Trash2 size={16} />
                                </div>
                                {t('ui.management.confirmDelete')}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-bold opacity-70 leading-relaxed mb-1">
                                {t('ui.management.deleteWarning')}
                            </p>
                            <div className="bg-error/10 px-4 py-2 rounded-xl mb-6 font-black text-error text-center tracking-tight">
                                "{scripts.find(s => s.id === deletingScriptId)?.name}"
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center">
                                {t('ui.management.deleteWarningDetail')}
                            </p>
                        </div>
                        <div className="p-6 flex items-center justify-end gap-3 bg-base-300/20">
                            <button className="btn btn-ghost btn-sm font-black uppercase tracking-widest text-[11px]" onClick={() => setDeletingScriptId(null)}>
                                {t('ui.management.cancel')}
                            </button>
                            <button className="btn btn-error btn-sm px-6 font-black uppercase tracking-widest text-[11px] text-error-content shadow-lg shadow-error/20" onClick={() => handleDelete(deletingScriptId)}>
                                {t('ui.management.deletePermanently')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Conflict Premium */}
            {importConflictName && pendingZipFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 premium-blur animate-in fade-in duration-300">
                    <div className="modal-box max-w-sm glass-card p-0 overflow-hidden border-warning/20 animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-warning/10 bg-gradient-to-br from-warning/10 to-transparent">
                            <h3 className="font-black text-xl text-warning flex items-center gap-3">
                                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
                                    <Upload size={16} />
                                </div>
                                {t('ui.management.nameConflict')}
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <p className="text-xs font-bold opacity-60 leading-relaxed">
                                {t('ui.management.importConflictText')}
                                <span className="block mt-2 font-black text-warning underline underline-offset-4 decoration-2">"{importConflictName}"</span>
                            </p>

                            <div className="form-control w-full">
                                <input
                                    type="text"
                                    className="input bg-base-300/30 border-white/5 focus:border-warning/50 w-full font-bold h-12"
                                    value={importNewName}
                                    onChange={e => setImportNewName(e.target.value)}
                                    placeholder={t('ui.management.renameTo')}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleImport(pendingZipFile, importNewName)}
                                />
                            </div>
                        </div>
                        <div className="p-6 flex items-center justify-end gap-3 bg-base-300/20">
                            <button className="btn btn-ghost btn-sm font-black uppercase tracking-widest text-[11px]" onClick={() => {
                                setImportConflictName(null);
                                setPendingZipFile(null);
                            }}>
                                {t('ui.management.cancel')}
                            </button>
                            <button
                                className="btn btn-warning btn-sm px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-warning/20"
                                onClick={() => handleImport(pendingZipFile, importNewName)}
                                disabled={!importNewName || importNewName === importConflictName}
                            >
                                {t('ui.management.importAsNew')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
