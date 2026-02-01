package process_manager

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

type ScriptManager struct {
	processes map[string]*ScriptProcess
	mu        sync.RWMutex
	CorePath  string // Path to core directory
	PythonPath string // Path to python executable
}

type ScriptProcess struct {
	ID        string
	ScriptID  string
	Cmd       *exec.Cmd
	StartTime time.Time
	Status    string
	Logs      chan string
	Cancel    context.CancelFunc
}

func NewScriptManager(corePath, pythonPath string) *ScriptManager {
	return &ScriptManager{
		processes:  make(map[string]*ScriptProcess),
		CorePath:   corePath,
		PythonPath: pythonPath,
	}
}

func (sm *ScriptManager) ListScripts() ([]map[string]string, error) {
	// Call python entry.py list
	scriptPath := filepath.Join(sm.CorePath, "entry.py")
	cmd := exec.Command(sm.PythonPath, scriptPath, "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list scripts: %v, output: %s", err, string(output))
	}

	var scripts []map[string]string
	if err := json.Unmarshal(output, &scripts); err != nil {
		return nil, fmt.Errorf("failed to parse script list: %v, raw: %s", err, string(output))
	}

	return scripts, nil
}

func (sm *ScriptManager) RunScript(scriptID string, params string) (string, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Simple ID generation
	runID := fmt.Sprintf("%s-%d", scriptID, time.Now().Unix())

	ctx, cancel := context.WithCancel(context.Background())
	
	scriptPath := filepath.Join(sm.CorePath, "entry.py")
	cmd := exec.CommandContext(ctx, sm.PythonPath, scriptPath, "run", "--script", scriptID)
	if params != "" {
		cmd.Args = append(cmd.Args, "--params", params)
	}

	// Setup pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return "", err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return "", err
	}

	if err := cmd.Start(); err != nil {
		cancel()
		return "", err
	}

	process := &ScriptProcess{
		ID:        runID,
		ScriptID:  scriptID,
		Cmd:       cmd,
		StartTime: time.Now(),
		Status:    "running",
		Logs:      make(chan string, 100), // Buffer logs
		Cancel:    cancel,
	}

	sm.processes[runID] = process

	// Start goroutine to consume logs
	go sm.monitorProcess(process, stdout, stderr)

	return runID, nil
}

func (sm *ScriptManager) monitorProcess(p *ScriptProcess, stdout, stderr io.ReadCloser) {
	defer close(p.Logs)
	
	// Multi-reader scanner
	// For simplicity, handle stdout only mostly, but stderr is important too
	// We'll trust that entry.py flushes everything
	
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			p.Logs <- scanner.Text()
		}
	}()
	
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			p.Logs <- fmt.Sprintf(`{"type": "stderr", "message": "%s"}`, scanner.Text())
		}
	}()

	err := p.Cmd.Wait()
	p.Status = "finished"
	
	endMsg := map[string]string{
		"type": "status",
		"message": "Process exited",
	}
	if err != nil {
		endMsg["message"] = fmt.Sprintf("Process exited with error: %v", err)
		endMsg["type"] = "error"
	}
	
	jsonMsg, _ := json.Marshal(endMsg)
	p.Logs <- string(jsonMsg)
	
	// Cleanup happens in manager or via explicit delete
}

func (sm *ScriptManager) StopScript(runID string) error {
	sm.mu.RLock()
	process, ok := sm.processes[runID]
	sm.mu.RUnlock()

	if !ok {
		return fmt.Errorf("process not found")
	}

	process.Cancel() // Kills the context, thus the process
	return nil
}

func (sm *ScriptManager) GetLogChannel(runID string) (<-chan string, error) {
	sm.mu.RLock()
	process, ok := sm.processes[runID]
	sm.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("process not found")
	}
	
	return process.Logs, nil
}
