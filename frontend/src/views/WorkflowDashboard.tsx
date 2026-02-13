import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import {
    LayoutGrid, Plus, Search, Trash2, Folder, Activity, MoreVertical,
    Edit2
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { showToast } from '../utils/toast';
import clsx from 'clsx';

interface WorkflowDashboardProps {
    onSelectWorkflow: (id: string, projectId: string) => void;
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({ onSelectWorkflow }) => {
    const {
        projects, fetchProjects, apiBaseUrl
    } = useAppStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [isCreateWfModalOpen, setIsCreateWfModalOpen] = useState(false);
    const [targetProjectId, setTargetProjectId] = useState<string | null>(null);

    const [newProjectName, setNewProjectName] = useState('');
    const [newWfName, setNewWfName] = useState('');

    // Deletion
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);

    // Rename
    const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'workflow', id: string, name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Handlers
    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const res = await fetch(`${apiBaseUrl}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName, platform: 'android' })
            });
            if (!res.ok) throw new Error('Failed');
            setIsCreateProjectModalOpen(false);
            setNewProjectName('');
            fetchProjects();
            showToast("Project created", "success");
        } catch (e) { showToast("Failed to create project", "error"); }
    };

    const handleCreateWorkflow = async () => {
        if (!newWfName.trim() || !targetProjectId) return;
        try {
            const res = await fetch(`${apiBaseUrl}/workflows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: targetProjectId, name: newWfName })
            });
            if (!res.ok) throw new Error('Failed');
            setIsCreateWfModalOpen(false);
            setNewWfName('');
            setTargetProjectId(null);
            fetchProjects();
            showToast("Workflow created", "success");
        } catch (e) { showToast("Failed to create workflow", "error"); }
    };

    const handleRename = async () => {
        if (!renameTarget || !renameValue.trim()) return;
        try {
            const endpoint = renameTarget.type === 'project'
                ? `${apiBaseUrl}/projects/${renameTarget.id}/rename`
                : `${apiBaseUrl}/workflows/${renameTarget.id}/rename`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameValue })
            });
            if (!res.ok) throw new Error('Failed');
            setRenameTarget(null);
            setRenameValue('');
            fetchProjects();
            showToast("Renamed successfully", "success");
        } catch (e) { showToast("Rename failed", "error"); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const endpoint = deleteTarget.type === 'project'
                ? `${apiBaseUrl}/projects/${deleteTarget.id}`
                : `${apiBaseUrl}/workflows/${deleteTarget.id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setDeleteTarget(null);
            fetchProjects();
            showToast("Deleted successfully", "success");
        } catch (e) { showToast("Delete failed", "error"); }
    };

    const filteredProjects = searchTerm.trim()
        ? projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.workflows || []).some((w:any) => w.name.toLowerCase().includes(searchTerm.toLowerCase())))
        : projects;

    return (
        <div className="flex-1 flex flex-col bg-base-100 overflow-hidden">
            {/* Header / Hero */}
            <div className="bg-base-200/50 border-b border-base-300 px-8 py-8 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <LayoutGrid className="text-primary" size={28} />
                            Workflows
                        </h1>
                        <p className="text-base-content/50 mt-1 text-sm">Manage your automation projects and workflows.</p>
                    </div>
                    <button className="btn btn-primary gap-2" onClick={() => setIsCreateProjectModalOpen(true)}>
                        <Plus size={18} /> New Project
                    </button>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                        type="text"
                        placeholder="Search projects or workflows..."
                        className="input input-bordered w-full pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden group">
                            {/* Project Header */}
                            <div className="bg-base-200/30 px-6 py-4 flex items-center justify-between border-b border-base-300/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Folder size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{project.name}</h3>
                                        <div className="text-xs opacity-40 flex items-center gap-2 mt-0.5">
                                            <span>{project.workflows?.length || 0} workflows</span>
                                            <span>•</span>
                                            <span>Updated just now</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        className="btn btn-sm btn-ghost gap-2"
                                        onClick={() => { setTargetProjectId(project.id); setIsCreateWfModalOpen(true); }}
                                    >
                                        <Plus size={16} /> Workflow
                                    </button>
                                    <div className="dropdown dropdown-end">
                                        <label tabIndex={0} className="btn btn-sm btn-ghost btn-square m-1"><MoreVertical size={16} /></label>
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-200">
                                            <li><a onClick={() => { setRenameTarget({type:'project', id:project.id, name:project.name}); setRenameValue(project.name); }}><Edit2 size={14} /> Rename</a></li>
                                            <li><a className="text-error" onClick={() => setDeleteTarget({type:'project', id:project.id, name:project.name})}><Trash2 size={14} /> Delete</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Workflows List */}
                            <div className="divide-y divide-base-200">
                                {project.workflows?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-base-200">
                                        {project.workflows.map((wf: any) => (
                                            <div
                                                key={wf.id}
                                                className="p-5 hover:bg-base-200/50 transition-colors cursor-pointer group/wf relative border-b border-base-200 last:border-b-0"
                                                onClick={() => onSelectWorkflow(wf.id, project.id)}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                                                        <Activity size={16} />
                                                    </div>
                                                    <div className="dropdown dropdown-end opacity-0 group-hover/wf:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <label tabIndex={0} className="btn btn-xs btn-ghost btn-square"><MoreVertical size={14} /></label>
                                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40 border border-base-200">
                                                            <li><a onClick={() => { setRenameTarget({type:'workflow', id:wf.id, name:wf.name}); setRenameValue(wf.name); }}><Edit2 size={12} /> Rename</a></li>
                                                            <li><a className="text-error" onClick={() => setDeleteTarget({type:'workflow', id:wf.id, name:wf.name})}><Trash2 size={12} /> Delete</a></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-sm mb-1">{wf.name}</h4>
                                                <p className="text-xs opacity-40 line-clamp-2 min-h-[2.5em]">{wf.description || "No description."}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center opacity-30 text-sm italic">
                                        No workflows yet. Click "New Workflow" to start.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredProjects.length === 0 && (
                        <div className="text-center py-20 opacity-30">
                            <div className="text-lg font-bold">No projects found</div>
                            <p>Create a new project to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <dialog className={clsx("modal", isCreateProjectModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Create Project</h3>
                    <input className="input input-bordered w-full" placeholder="Project Name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} autoFocus />
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsCreateProjectModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateProject}>Create</button>
                    </div>
                </div>
            </dialog>

            <dialog className={clsx("modal", isCreateWfModalOpen && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Create Workflow</h3>
                    <input className="input input-bordered w-full" placeholder="Workflow Name" value={newWfName} onChange={e => setNewWfName(e.target.value)} autoFocus />
                    <div className="modal-action">
                        <button className="btn" onClick={() => setIsCreateWfModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateWorkflow}>Create</button>
                    </div>
                </div>
            </dialog>

            <ConfirmModal
                isOpen={!!deleteTarget}
                title={`Delete ${deleteTarget?.type}`}
                message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                type="danger"
            />

            <dialog className={clsx("modal", !!renameTarget && "modal-open")}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Rename {renameTarget?.type}</h3>
                    <input className="input input-bordered w-full" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
                    <div className="modal-action">
                        <button className="btn" onClick={() => setRenameTarget(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleRename}>Save</button>
                    </div>
                </div>
            </dialog>
        </div>
    );
};
