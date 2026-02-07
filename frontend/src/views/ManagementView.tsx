import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Upload, Trash2, Edit2, Search, Download } from 'lucide-react';
import { type Script } from '../store';
import clsx from 'clsx';
import axios from 'axios';
import { useAppStore } from '../store';

export const ManagementView: React.FC = () => {
    const { t } = useTranslation();
    const { apiBaseUrl, scripts, fetchScripts } = useAppStore();
    const API_Base = apiBaseUrl;
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [deletingScriptId, setDeletingScriptId] = useState<string | null>(null);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    const [newName, setNewName] = useState('');
    const [renameError, setRenameError] = useState<string | null>(null);

    // Import states
    const [pendingZipFile, setPendingZipFile] = useState<File | null>(null);
    const [importConflictName, setImportConflictName] = useState<string | null>(null);
    const [importNewName, setImportNewName] = useState('');

    // Progress state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setIsLoading(true);
        await fetchScripts();
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`${API_Base}/scripts/${id}`, { method: 'DELETE' });
            handleFetch();
            setDeletingScriptId(null);
        } catch (error) {
            console.error('Failed to delete script', error);
        }
    };


    const handleRename = async () => {
        if (!editingScript) return;
        setRenameError(null);

        if (!newName.trim()) {
            setRenameError("Name cannot be empty");
            return;
        }

        try {
            const res = await fetch(`${API_Base}/scripts/${editingScript.id}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName: newName })
            });

            if (res.ok) {
                handleFetch();
                setIsRenameModalOpen(false);
                setEditingScript(null);
            } else {
                const err = await res.text();
                try {
                    const jsonErr = JSON.parse(err);
                    setRenameError(jsonErr.error || "Rename failed");
                } catch {
                    setRenameError(err || "Rename failed");
                }
            }
        } catch (error) {
            console.error('Failed to rename script', error);
            setRenameError("Network error");
        }
    };

    const handleImport = async (file: File, requestedNewName?: string) => {
        console.log("Preparing to upload (Base64):", file.name, "Size:", file.size);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Read file as Base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result as string;
                    resolve(res.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await axios.post(`${API_Base}/scripts/import`, {
                filename: file.name,
                data: base64Data,
                newName: requestedNewName || ''
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || (base64Data.length);
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(Math.min(percentCompleted, 99));
                }
            });

            if (res.status === 200) {
                setUploadProgress(100);
                // Give it a moment to show 100%
                await new Promise(resolve => setTimeout(resolve, 300));
                handleFetch();
                setImportConflictName(null);
                setPendingZipFile(null);
                setImportNewName('');
            }
        } catch (err: any) {
            if (err.response && err.response.status === 409) {
                const data = err.response.data;
                setImportConflictName(data.suggestedName || file.name.replace(".zip", ""));
                setPendingZipFile(file);
                setImportNewName(data.suggestedName + "_copy");
            } else {
                console.error("Import failed", err);
            }
        } finally {
            // Ensure modal stays visible for at least 800ms total for better UX
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    const filtered = scripts.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 h-full flex flex-col bg-base-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                        <MoreHorizontal className="w-8 h-8 text-primary" />
                        {t('management.title', 'Management')}
                    </h1>
                    <p className="text-base-content/60 text-sm mt-1">
                        {t('management.subtitle', 'LIBRARY INFRASTRUCTURE')} / {scripts.length} {t('management.totalScripts', 'TOTAL SCRIPTS')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                        <input
                            type="text"
                            placeholder={t('management.searchPlaceholder', 'Search Script...')}
                            className="input input-sm input-bordered pl-9 w-64 bg-base-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="btn btn-sm btn-primary gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {t('management.upload', 'Upload Script (ZIP)')}
                        <input
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    handleImport(e.target.files[0]);
                                    e.target.value = ''; // Reset
                                }
                            }}
                        />
                    </label>
                </div>
            </div>

            {/* Content using Grid instead of Table for Modern Card UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4">
                {isLoading ? (
                    // Skeleton Loading
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="card bg-base-200 shadow-sm animate-pulse h-40"></div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-base-content/40 border-2 border-dashed border-base-300 rounded-xl">
                        <MoreHorizontal className="w-12 h-12 mb-2 opacity-50" />
                        <p>{t('management.noScripts', 'No scripts found')}</p>
                    </div>
                ) : (
                    filtered.map((script) => (
                        <div key={script.id} className="card bg-base-200 shadow-sm hover:shadow-md transition-all border border-base-300 group">
                            <div className="card-body p-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="card-title text-lg truncate" title={script.name}>
                                            {script.name}
                                        </h3>
                                        <p className="text-xs text-base-content/50 uppercase tracking-wider font-mono mt-1 truncate">
                                            ID: {script.id}
                                        </p>
                                    </div>
                                    <div className="badge badge-neutral badge-outline text-xs">
                                        {script.platform}
                                    </div>
                                </div>

                                <p className="text-sm text-base-content/70 mt-3 line-clamp-2 h-10">
                                    {script.description || t('management.noDescription', 'No description provided')}
                                </p>

                                <div className="card-actions justify-end mt-4 pt-4 border-t border-base-content/10">
                                    <button
                                        className="btn btn-ghost btn-xs text-warning tooltip tooltip-bottom"
                                        data-tip={t('management.rename', 'Rename')}
                                        onClick={() => {
                                            setEditingScript(script);
                                            setNewName(script.name);
                                            setRenameError(null);
                                            setIsRenameModalOpen(true);
                                        }}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                        href={`${API_Base}/scripts/${script.id}/export`}
                                        download
                                        className="btn btn-ghost btn-xs text-info tooltip tooltip-bottom"
                                        data-tip={t('management.export', 'Export')}
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                        className="btn btn-ghost btn-xs text-error tooltip tooltip-bottom"
                                        data-tip={t('management.delete', 'Delete')}
                                        onClick={() => setDeletingScriptId(script.id)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Rename Modal */}
            <dialog className={clsx("modal", isRenameModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">{t('management.renameModalTitle', 'Rename Script')}</h3>
                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text">{t('management.scriptName', 'Script Name')}</span>
                        </label>
                        <input
                            type="text"
                            className={clsx("input input-bordered w-full", renameError && "input-error")}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename();
                            }}
                            autoFocus
                        />
                        {renameError && (
                            <label className="label">
                                <span className="label-text-alt text-error">{renameError}</span>
                            </label>
                        )}
                    </div>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsRenameModalOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button className="btn btn-primary" onClick={handleRename}>
                            {t('common.save', 'Save')}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setIsRenameModalOpen(false)}>close</button>
                </form>
            </dialog>

            {/* Delete Confirmation Modal */}
            <dialog className={clsx("modal", deletingScriptId && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">{t('management.deleteTitle', 'Delete Script')}</h3>
                    <p className="py-4">
                        {t('management.deleteConfirm', 'Are you sure you want to delete this script? This action cannot be undone.')}
                    </p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => setDeletingScriptId(null)}>
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            className="btn btn-error"
                            onClick={() => deletingScriptId && handleDelete(deletingScriptId)}
                        >
                            {t('common.delete', 'Delete')}
                        </button>
                    </div>
                </div>
            </dialog>

            {/* Import Conflict Modal */}
            <dialog className={clsx("modal", importConflictName && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-warning">{t('management.conflictTitle', 'Script Conflict')}</h3>
                    <p className="py-2">
                        {t('management.conflictMessage', 'A script with this name already exists.')}
                    </p>
                    <div className="form-control w-full mt-2">
                        <label className="label">
                            <span className="label-text">{t('management.newName', 'Save as new name')}</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={importNewName}
                            onChange={(e) => setImportNewName(e.target.value)}
                        />
                    </div>
                    <div className="modal-action">
                        <button
                            className="btn"
                            onClick={() => {
                                setImportConflictName(null);
                                setPendingZipFile(null);
                            }}
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (pendingZipFile && importNewName) {
                                    handleImport(pendingZipFile, importNewName);
                                }
                            }}
                        >
                            {t('common.confirm', 'Confirm')}
                        </button>
                    </div>
                </div>
            </dialog>
            {/* Progress Modal */}
            <dialog className={clsx("modal", isUploading && "modal-open")}>
                <div className="modal-box text-center max-w-sm">
                    <h3 className="font-bold text-lg mb-2">{t('management.uploading', 'Importing Script...')}</h3>
                    <p className="text-sm text-base-content/60 mb-6">
                        {uploadProgress < 100 ? t('management.uploading_desc', 'Uploading files...') : t('management.processing_desc', 'Processing ZIP archive...')}
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-full h-4 bg-base-300 rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <span className="text-2xl font-bold font-mono text-primary">{uploadProgress}%</span>
                    </div>
                </div>
            </dialog>
        </div>
    );
};
