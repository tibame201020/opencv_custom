import React, { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store';
import { WorkflowDashboard } from './WorkflowDashboard';
import { WorkflowView } from './WorkflowView';
import { showToast } from '../utils/toast';
import clsx from 'clsx';

export const WorkflowEditorView: React.FC = () => {
    const {
        apiBaseUrl,
        workflowTabs, activeWorkflowTabId,
        openWorkflowTab, closeWorkflowTab, setActiveWorkflowTab,
        updateWorkflowTabContent, saveWorkflowTab,
        setWorkflowSelectedId
    } = useAppStore();

    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [executionState, setExecutionState] = useState<any[]>([]);

    const activeTab = workflowTabs.find(t => t.id === activeWorkflowTabId);

    // Open Workflow Logic
    const handleSelectWorkflow = useCallback(async (id: string, projectId: string) => {
        const tabId = `wf:${id}`;
        const existing = workflowTabs.find(t => t.id === tabId);

        if (existing) {
            setActiveWorkflowTab(tabId);
            setWorkflowSelectedId(id);
            return;
        }

        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${id}`);
            if (res.ok) {
                const data = await res.json();
                openWorkflowTab(id, projectId, data.name, JSON.stringify(data, null, 2));
                setWorkflowSelectedId(id);
            } else {
                showToast("Failed to load workflow", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
    }, [workflowTabs, apiBaseUrl, openWorkflowTab, setActiveWorkflowTab, setWorkflowSelectedId]);

    // Save Logic
    const handleSave = useCallback(async () => {
        if (!activeTab) return;
        setIsSaving(true);
        try {
            const data = JSON.parse(activeTab.content);
            const res = await fetch(`${apiBaseUrl}/workflows/${activeTab.workflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                saveWorkflowTab(activeTab.id);
                showToast("Saved", "success");
            } else {
                showToast("Save failed", "error");
            }
        } catch (err) {
            showToast("Save error", "error");
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, apiBaseUrl, saveWorkflowTab]);

    // Run Logic
    const handleRun = useCallback(async () => {
        if (!activeTab) return;
        setIsRunning(true);
        setLogs([]);
        setExecutionState([]);

        // Auto save before run? or just run current content?
        // Ideally backend runs saved version. Let's save first if dirty?
        // Or send content to run endpoint?
        // Current API /run runs the DB version. So we MUST save.
        if (activeTab.isDirty) {
            await handleSave();
        }

        try {
            const res = await fetch(`${apiBaseUrl}/workflows/${activeTab.workflowId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Started", "success");

                if (data.runId) {
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    let wsUrl = '';
                    if (apiBaseUrl.startsWith('http')) {
                        const url = new URL(apiBaseUrl);
                        wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws/logs/${data.runId}`;
                    } else {
                        wsUrl = `${wsProtocol}//${window.location.host}/ws/logs/${data.runId}`;
                    }

                    const ws = new WebSocket(wsUrl);
                    ws.onmessage = (event) => {
                        try {
                            const msg = JSON.parse(event.data);
                            setLogs(prev => [...prev, msg]);
                            if (msg.type === 'execution_step') {
                                setExecutionState(prev => [...prev, msg.data]);
                            }
                            if (msg.type === 'status' && (msg.message?.includes('Complete') || msg.message?.includes('exited') || msg.message?.includes('cancelled'))) {
                                setIsRunning(false);
                                ws.close();
                            }
                        } catch (e) {
                            setLogs(prev => [...prev, { type: 'stdout', message: event.data }]);
                        }
                    };
                    ws.onerror = () => setIsRunning(false);
                    ws.onclose = () => setIsRunning(false);
                } else {
                    setIsRunning(false);
                }
            } else {
                showToast(`Run failed: ${data.error}`, "error");
                setIsRunning(false);
            }
        } catch (err) {
            showToast("Execution error", "error");
            setIsRunning(false);
        }
    }, [activeTab, apiBaseUrl, handleSave]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // Close Handler
    const handleClose = () => {
        if (activeTab) {
            closeWorkflowTab(activeTab.id);
            setWorkflowSelectedId(null);
        }
    };

    // Render Logic
    if (activeTab) {
        return (
            <div className="h-full w-full bg-base-100 flex flex-col relative">
                <WorkflowView
                    tab={activeTab}
                    onContentChange={(c) => updateWorkflowTabContent(activeTab.id, c)}
                    onRun={handleRun}
                    onSave={handleSave}
                    onBack={handleClose}
                    isExecuting={isRunning}
                    isSaving={isSaving}
                    executionState={executionState}
                />
                {/* Log Overlay */}
                {(isRunning || logs.length > 0) && (
                    <div className="absolute bottom-0 left-0 right-0 h-48 bg-base-100 border-t border-base-300 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 flex flex-col animate-in slide-in-from-bottom duration-200">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-base-200 bg-base-200/50">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-50 flex items-center gap-2">
                                Execution Logs {isRunning && <span className="loading loading-dots loading-xs"></span>}
                            </span>
                            <button className="btn btn-ghost btn-xs btn-square" onClick={() => { setLogs([]); }}>
                                <span className="text-xl">×</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className={clsx(
                                    "break-all",
                                    log.level === 'error' || log.type === 'error' ? "text-error" :
                                    log.level === 'warn' ? "text-warning" :
                                    log.type === 'status' ? "text-info opacity-70" : "text-base-content/70"
                                )}>
                                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                    {typeof log === 'string' ? log : (log.message || JSON.stringify(log))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <WorkflowDashboard onSelectWorkflow={handleSelectWorkflow} />;
};
