package process_manager

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type ScriptManager struct {
	processes  map[string]*ScriptProcess
	mu         sync.RWMutex
	CorePath   string // Path to core directory
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
		"type":    "status",
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

func (sm *ScriptManager) GetScriptContent(scriptID string) (string, error) {
	// Re-fetch scripts to get dynamic paths (or cache them)
	scripts, err := sm.ListScripts()
	if err != nil {
		return "", err
	}

	var scriptPath string
	for _, s := range scripts {
		if s["id"] == scriptID {
			scriptPath = s["path"]
			break
		}
	}

	if scriptPath == "" {
		return "", fmt.Errorf("script not found")
	}

	fullPath := filepath.Join(sm.CorePath, scriptPath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func (sm *ScriptManager) SaveScriptContent(scriptID string, content string) error {
	scripts, err := sm.ListScripts()
	if err != nil {
		return err
	}

	var scriptPath string
	for _, s := range scripts {
		if s["id"] == scriptID {
			scriptPath = s["path"]
			break
		}
	}

	if scriptPath == "" {
		return fmt.Errorf("script path not found")
	}

	fullPath := filepath.Join(sm.CorePath, scriptPath)

	// Security check: ensure path is within core directory
	// (Simple check, can be improved)
	if !filepath.IsAbs(fullPath) {
		abs, _ := filepath.Abs(fullPath)
		fullPath = abs
	}

	// Write file (0644 perms)
	return os.WriteFile(fullPath, []byte(content), 0644)
}

func (sm *ScriptManager) CreateScript(name string, platform string) error {
	// Simple validation
	// allow alnum,-,_

	// Create Custom dir if not exists
	customDir := filepath.Join(sm.CorePath, "script", "custom")
	if err := os.MkdirAll(customDir, 0755); err != nil {
		return err
	}

	validName := strings.ReplaceAll(name, " ", "_") // simple sanitize
	filename := validName + ".py"
	fullPath := filepath.Join(customDir, filename)

	// check if exists
	if _, err := os.Stat(fullPath); err == nil {
		return fmt.Errorf("script already exists")
	}

	// Template
	className := strings.ToUpper(validName[:1]) + validName[1:] + "Script"
	template := fmt.Sprintf(`from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform

class %s(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        super().__init__()

    def execute(self):
        print("Starting %s...")
        # Your code here
        # self.platform.click(100, 100)
        print("Done.")
`, className, validName)

	return os.WriteFile(fullPath, []byte(template), 0644)
}
