import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Upload, Trash2, Edit2, Search, Save, Download } from 'lucide-react';
import { type Script } from '../store';
import clsx from 'clsx';

const API_Base = "http://localhost:8080/api";

export const ManagementView: React.FC = () => {
    const { t } = useTranslation();
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
                console.error("Rename failed", err);
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
                    <input
                        type="file"
                        id="import-script"
                        className="hidden"
                        accept=".zip"
                        value="" // Reset value so same file can be selected again
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(file);
                        }}
                    />
                    <button
                        className="btn btn-sm btn-outline gap-2"
                        title={t('ui.management.upload')}
                        onClick={() => document.getElementById('import-script')?.click()}
                    >
                        <Upload size={16} /> <span className="hidden sm:inline">{t('ui.management.upload')} (ZIP)</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 opacity-30 italic">No scripts found.</div>
                    ) : filtered.map(script => (
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
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-36 border border-base-200">
                                            <li><a onClick={() => handleExport(script.id)}><Download size={14} /> {t('ui.management.export')}</a></li>
                                            {script.path?.startsWith('script/custom/') && (
                                                <>
                                                    <li><a onClick={() => handleEdit(script)}><Edit2 size={14} /> {t('ui.management.rename')}</a></li>
                                                    <li><a className="text-error" onClick={() => setDeletingScriptId(script.id)}><Trash2 size={14} /> {t('ui.management.delete')}</a></li>
                                                </>
                                            )}
                                            {!script.path?.startsWith('script/custom/') && (
                                                <li className="disabled"><span className="text-xs opacity-40">{t('ui.management.systemScript')}</span></li>
                                            )}
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

            {/* Rename Modal */}
            {isRenameModalOpen && editingScript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="modal-box max-w-sm bg-base-100 border border-base-200 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Edit2 size={20} className="text-primary" />
                            {t('ui.management.renameScript')}
                        </h3>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text opacity-60">New Name for "{editingScript.name}"</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full font-medium"
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
                                    <span className="label-text-alt text-error font-medium">{renameError}</span>
                                </label>
                            ) : (
                                <label className="label">
                                    <span className="label-text-alt text-base-content/40">{t('ui.management.renameHelp')}</span>
                                </label>
                            )}
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsRenameModalOpen(false)}>
                                {t('ui.management.cancel')}
                            </button>
                            <button
                                className="btn btn-primary px-6"
                                onClick={handleSaveRename}
                                disabled={!newName || newName === editingScript.name}
                            >
                                <Save size={16} /> {t('ui.management.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingScriptId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="modal-box max-w-sm border border-error/20 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="font-bold text-lg text-error flex items-center gap-2">
                            <Trash2 size={20} />
                            {t('ui.management.confirmDelete')}
                        </h3>
                        <p className="py-4 opacity-70">
                            {t('ui.management.deleteWarning')} <span className="font-bold text-base-content">"{scripts.find(s => s.id === deletingScriptId)?.name}"</span>?
                            {t('ui.management.deleteWarningDetail')}
                        </p>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setDeletingScriptId(null)}>
                                {t('ui.management.cancel')}
                            </button>
                            <button className="btn btn-error text-error-content px-6" onClick={() => handleDelete(deletingScriptId)}>
                                {t('ui.management.deletePermanently')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Conflict Modal */}
            {importConflictName && pendingZipFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="modal-box max-w-sm border border-warning/20 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="font-bold text-lg text-warning flex items-center gap-2">
                            <Upload size={20} />
                            {t('ui.management.nameConflict')}
                        </h3>
                        <p className="py-4 opacity-70 text-sm">
                            {t('ui.management.importConflictText')} <span className="font-bold text-base-content">"{importConflictName}"</span>?
                        </p>

                        <div className="form-control w-full">
                            <input
                                type="text"
                                className="input input-bordered w-full font-medium"
                                value={importNewName}
                                onChange={e => setImportNewName(e.target.value)}
                                placeholder={t('ui.management.renameTo')}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleImport(pendingZipFile, importNewName)}
                            />
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => {
                                setImportConflictName(null);
                                setPendingZipFile(null);
                            }}>
                                {t('ui.management.cancel')}
                            </button>
                            <button
                                className="btn btn-warning px-6"
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
