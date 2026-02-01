import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Play, Square, Terminal, Monitor, Smartphone, RefreshCw } from 'lucide-react';

interface Script {
    id: string;
    name: string;
    platform: 'desktop' | 'android';
}

interface LogMessage {
    type: 'stdout' | 'stderr' | 'status' | 'error' | 'result';
    message?: string;
    data?: any;
}

const API_Base = 'http://localhost:8080/api';
const WS_Base = 'ws://localhost:8080/ws/logs';

export const Dashboard: React.FC = () => {
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        fetchScripts();
    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const fetchScripts = async () => {
        try {
            const res = await axios.get(`${API_Base}/scripts`);
            setScripts(res.data);
        } catch (err) {
            console.error("Failed to fetch scripts", err);
        }
    };

    const handleRun = async () => {
        if (!selectedScript) return;

        setLogs([]);
        setIsRunning(true);

        try {
            const res = await axios.post(`${API_Base}/run`, {
                scriptId: selectedScript,
                params: "{}"
            });

            const runId = res.data.runId;
            setActiveRunId(runId);
            connectWebSocket(runId);
        } catch (err) {
            console.error("Run failed", err);
            setLogs(prev => [...prev, { type: 'error', message: 'Failed to start script' }]);
            setIsRunning(false);
        }
    };

    const handleStop = async () => {
        if (!activeRunId) return;
        try {
            await axios.post(`${API_Base}/stop`, { runId: activeRunId });
        } catch (err) {
            console.error("Stop failed", err);
        }
    };

    const connectWebSocket = (runId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(`${WS_Base}/${runId}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const parsedMsg = typeof msg === 'string' ? JSON.parse(msg) : msg;
                setLogs(prev => [...prev, parsedMsg]);

                if (parsedMsg.type === 'status' && parsedMsg.message === 'Process exited') {
                    setIsRunning(false);
                    setActiveRunId(null);
                }
            } catch (e) {
                setLogs(prev => [...prev, { type: 'stdout', message: event.data }]);
            }
        };

        ws.onclose = () => {
            if (isRunning) {
                // Maybe connection lost
            }
        };
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="brand-icon">
                        <Terminal size={20} color="white" />
                    </div>
                    <h1 style={{ fontWeight: 700, fontSize: '1.1rem' }}>AutoScript</h1>
                </div>

                <div className="sidebar-content">
                    <div className="label">Available Scripts</div>
                    {scripts.map(script => (
                        <button
                            key={script.id}
                            onClick={() => setSelectedScript(script.id)}
                            className={`script-btn ${selectedScript === script.id ? 'active' : ''}`}
                        >
                            {script.platform === 'desktop' ? <Monitor size={16} /> : <Smartphone size={16} />}
                            <span>{script.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                <div className="top-bar">
                    <h2 style={{ fontWeight: 600 }}>
                        {scripts.find(s => s.id === selectedScript)?.name || 'Select a Script'}
                    </h2>

                    <div className="actions">
                        {selectedScript && (
                            !isRunning ? (
                                <button onClick={handleRun} className="btn btn-primary">
                                    <Play size={16} fill="currentColor" /> Run Script
                                </button>
                            ) : (
                                <button onClick={handleStop} className="btn btn-danger">
                                    <Square size={16} fill="currentColor" /> Stop
                                </button>
                            )
                        )}
                        <button onClick={fetchScripts} className="btn btn-icon">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className="terminal-container">
                    <div className="terminal-window">
                        <div className="terminal-header">
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>console_output</span>
                            <div className="window-controls">
                                <div className="control" style={{ background: '#ef4444' }}></div>
                                <div className="control" style={{ background: '#eab308' }}></div>
                                <div className="control" style={{ background: '#22c55e' }}></div>
                            </div>
                        </div>
                        <div className="terminal-body">
                            {logs.length === 0 && (
                                <div style={{ color: '#475569', fontStyle: 'italic' }}>Ready to execute...</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="log-entry">
                                    <span className="timestamp">[{new Date().toLocaleTimeString()}]</span>
                                    <span style={{
                                        color: log.type === 'error' ? '#f87171' :
                                            log.type === 'status' ? '#60a5fa' :
                                                log.type === 'stderr' ? '#facc15' : '#e2e8f0'
                                    }}>
                                        {log.message || JSON.stringify(log)}
                                    </span>
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
