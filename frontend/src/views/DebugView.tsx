import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, RefreshCw, Command, ChevronRight, Activity, Power, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';

type AdbStatus = 'running' | 'stopped' | 'unknown';

interface LogEntry {
    type: 'input' | 'output' | 'error';
    content: string;
    timestamp: Date;
}

export const DebugView: React.FC = () => {
    const { t } = useTranslation();
    // State
    const { apiBaseUrl: API_Base } = useAppStore();
    const [adbStatus, setAdbStatus] = useState<AdbStatus>('unknown');
    const [isLoading, setIsLoading] = useState(false);
    const [commandInput, setCommandInput] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const logEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial Check
    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000); // Polling status
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_Base}/adb/status`);
            if (res.ok) {
                const data = await res.json();
                setAdbStatus(data.status);
            } else {
                setAdbStatus('unknown');
            }
        } catch (err) {
            setAdbStatus('unknown');
        }
    };

    const toggleAdbServer = async () => {
        setIsLoading(true);
        const action = adbStatus === 'running' ? 'stop' : 'start';
        try {
            const res = await fetch(`${API_Base}/adb/${action}`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

            addLog('system', `Requesting ADB ${action}...`);
            // Wait a bit for process to spawn/die
            setTimeout(async () => {
                await checkStatus();
                setIsLoading(false);
                addLog('system', `ADB Server ${action}ed.`);
            }, 1000);
        } catch (err: any) {
            addLog('error', `Failed to ${action} ADB: ${err.message}`);
            setIsLoading(false);
        }
    };

    const executeCommand = async () => {
        if (!commandInput.trim()) return;

        const cmd = commandInput.trim();
        setCommandInput("");
        setHistory(prev => [...prev, cmd]);
        setHistoryIndex(-1);

        addLog('input', cmd);

        try {
            const res = await fetch(`${API_Base}/adb/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

            const data = await res.json();
            if (data.output) {
                addLog('output', data.output);
            } else {
                addLog('output', "(No output)");
            }
        } catch (err: any) {
            addLog('error', `Error executing command: ${err.message}`);
        }

        // Re-focus input
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const addLog = (type: 'input' | 'output' | 'error' | 'system', content: string) => {
        setLogs(prev => [...prev, {
            type: type as any,
            content,
            timestamp: new Date()
        }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0) {
                const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                // History is stored oldest -> newest. 
                // ArrowUp should go Newest -> Oldest.
                // history[length - 1 - index]
                const targetCmd = history[history.length - 1 - (newIndex === -1 ? 0 : newIndex)];
                if (targetCmd) setCommandInput(targetCmd);
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-base-100 overflow-hidden font-sans">
            {/* Header */}
            <div className="h-16 border-b border-base-200 flex items-center justify-between px-6 bg-base-100/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{t('ui.debug.title')}</h1>
                        <p className="text-xs opacity-50 font-mono">{t('ui.debug.subtitle')}</p>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
                        adbStatus === 'running' ? "bg-success/10 border-success/20 text-success" :
                            adbStatus === 'stopped' ? "bg-error/10 border-error/20 text-error" : "bg-base-300 border-base-content/10 text-base-content/50"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full",
                            adbStatus === 'running' ? "bg-current animate-pulse" : "bg-current"
                        )} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {adbStatus === 'running' ? t('ui.debug.daemonActive') : adbStatus === 'stopped' ? t('ui.debug.daemonStopped') : t('ui.debug.statusUnknown')}
                        </span>
                    </div>

                    <button
                        className={clsx("btn btn-sm gap-2 transition-all",
                            adbStatus === 'running' ? "btn-error" : "btn-success"
                        )}
                        onClick={toggleAdbServer}
                        disabled={isLoading}
                    >
                        {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Power size={16} />}
                        {adbStatus === 'running' ? t('ui.debug.stopServer') : t('ui.debug.startServer')}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">

                {/* Terminal Window */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e] rounded-xl shadow-xl border border-white/5 overflow-hidden ring-1 ring-black/5">
                    {/* Terminal Header */}
                    <div className="h-9 bg-[#2d2d2d] flex items-center px-4 gap-2 border-b border-white/5">
                        <Terminal size={14} className="text-gray-500" />
                        <span className="text-xs font-mono text-gray-400">{t('ui.debug.terminalTitle')}</span>
                        <div className="flex-1" />
                        <button
                            className="text-gray-500 hover:text-white transition-colors p-1"
                            onClick={() => setLogs([])}
                            title="Clear Terminal"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Terminal Output */}
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 custom-scrollbar text-gray-300">
                        <div className="text-gray-500 mb-4 select-none whitespace-pre-wrap">
                            {t('ui.debug.welcome')}
                            <br />--------------------------------------------------
                        </div>

                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2 break-all group">
                                <span className={clsx("shrink-0 w-4 select-none text-right opacity-30",
                                    log.type === 'input' ? "text-blue-400" : ""
                                )}>
                                    {log.type === 'input' ? '➜' : ''}
                                </span>
                                <span className={clsx("whitespace-pre-wrap flex-1",
                                    log.type === 'input' ? "text-blue-300 font-bold" :
                                        log.type === 'error' ? "text-red-400" :
                                            "text-gray-300"
                                )}>
                                    {log.content}
                                </span>
                                <span className="opacity-0 group-hover:opacity-20 text-[10px] select-none ml-2 text-gray-500 self-start mt-1">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                        {/* Auto-scroll anchor */}
                        <div ref={logEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-[#252525] border-t border-white/5 flex items-center gap-2">
                        <ChevronRight size={16} className="text-green-500 animate-pulse" />
                        <div className="text-gray-500 font-mono text-sm select-none">adb</div>
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-gray-200 font-mono placeholder:text-gray-700"
                            placeholder={t('ui.debug.placeholder')}
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-600 font-bold border border-white/5 px-2 py-0.5 rounded select-none">
                            <Command size={10} /> + ENTER
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Professional Touch) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Check Devices', cmd: 'devices -l' },
                        { label: 'TCP IP 5555', cmd: 'tcpip 5555' },
                        { label: 'Connect Local', cmd: 'connect 127.0.0.1:5555' },
                        { label: 'Version', cmd: 'version' },
                    ].map(action => (
                        <button
                            key={action.label}
                            className="btn btn-ghost bg-base-200/50 hover:bg-base-200 border border-base-300 h-auto py-3 px-4 flex flex-col items-start gap-1 text-left group"
                            onClick={() => {
                                // const cmd = action.cmd;
                                // setLogs(prev => [...prev, { type: 'input', content: cmd, timestamp: new Date() }]);
                                // axios.post(`${API_Base}/adb/command`, { command: cmd })
                                //     .then(res => addLog('output', res.data.output || "(No output)"))
                                //     .catch(err => addLog('error', err.message));
                                // Reverting to state based for UX consistency (though less efficient)
                                setCommandInput(action.cmd);
                                setTimeout(() => executeCommand(), 0);
                            }}
                        >
                            <span className="font-bold text-xs uppercase opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all">
                                {action.label}
                            </span>
                            <code className="text-[10px] font-mono opacity-50 bg-base-300 px-1 rounded">
                                adb {action.cmd}
                            </code>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
