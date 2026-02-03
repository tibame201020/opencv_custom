package process_manager

import (
	"archive/zip"
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
	processes   map[string]*ScriptProcess
	mu          sync.RWMutex
	CorePath    string // Path to core directory
	CmdPath     string // Path to python OR executable
	EntryScript string // Path to entry.py (optional if CmdPath is self-contained)
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

func NewScriptManager(corePath, cmdPath, entryScript string) *ScriptManager {
	return &ScriptManager{
		processes:   make(map[string]*ScriptProcess),
		CorePath:    corePath,
		CmdPath:     cmdPath,
		EntryScript: entryScript,
	}
}

func (sm *ScriptManager) ListScripts() ([]map[string]string, error) {
	var cmd *exec.Cmd
	if sm.EntryScript != "" {
		// Python Mode: python entry.py list
		scriptPath := filepath.Join(sm.CorePath, sm.EntryScript)
		cmd = exec.Command(sm.CmdPath, scriptPath, "list")
	} else {
		// Binary Mode: script-engine list
		cmd = exec.Command(sm.CmdPath, "list")
	}

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

	var cmd *exec.Cmd
	if sm.EntryScript != "" {
		// Python Mode
		scriptPath := filepath.Join(sm.CorePath, sm.EntryScript)
		cmd = exec.CommandContext(ctx, sm.CmdPath, scriptPath, "run", "--script", scriptID)
	} else {
		// Binary Mode: directory of binary is usually fine, or we set Cwd
		cmd = exec.CommandContext(ctx, sm.CmdPath, "run", "--script", scriptID)
		// Important: Set Dir to where the resources are if needed, but CorePath is mostly references
	}

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

	validName := strings.ReplaceAll(name, " ", "_")
	validName = strings.ReplaceAll(validName, "-", "_") // Hyphens are invalid in Python class/module names

	// Create Script Directory: script/custom/<name>
	scriptDir := filepath.Join(customDir, validName)
	if err := os.MkdirAll(scriptDir, 0755); err != nil {
		return fmt.Errorf("failed to create script directory: %v", err)
	}

	// Create Images Directory: script/custom/<name>/images
	imagesDir := filepath.Join(scriptDir, "images")
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return fmt.Errorf("failed to create images directory: %v", err)
	}

	// Create __init__.py
	initPath := filepath.Join(scriptDir, "__init__.py")
	if _, err := os.Stat(initPath); os.IsNotExist(err) {
		os.WriteFile(initPath, []byte(""), 0644)
	}

	filename := validName + ".py"
	fullPath := filepath.Join(scriptDir, filename)

	// check if exists
	if _, err := os.Stat(fullPath); err == nil {
		return fmt.Errorf("script already exists")
	}

	// Template
	className := strings.ToUpper(validName[:1]) + validName[1:] + "Script"
	var template string

	if platform == "desktop" {
		template = fmt.Sprintf(`from script.script_interface import ScriptInterface
from service.platform.robot.robot_platform import RobotPlatform
from service.core.opencv.dto import OcrRegion

class %s(ScriptInterface):
    def __init__(self, platform: RobotPlatform):
        self.platform = platform
        self.platform_type = "desktop"
        super().__init__()

    def execute(self):
        print(f"Starting %s (Desktop)...")
        
        # --- Useful Properties ---
        # print(f"Image Root: {self.image_root}")
        # print(f"Default Threshold: {self.default_threshold}")
        # print(f"Device ID: {self.deviceId}") # None for Desktop usually
        
        # --- Robot Platform Examples ---
        # self.platform.mouse_move(100, 100)
        # self.platform.click(100, 100)
        # self.platform.drag(100, 100, 200, 200, duration=1.0)
        # self.platform.type_text("Hello World")
        # self.platform.press_key("enter")
        
        print("Done.")
`, className, validName)
	} else {
		// Default to android
		template = fmt.Sprintf(`from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.dto import OcrRegion

class %s(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        self.platform_type = "android"
        super().__init__()

    def execute(self):
        print(f"Starting %s (Android)...")
        
        # --- Useful Properties ---
        print(f"Device ID: {self.deviceId}")
        print(f"Image Root: {self.image_root}")
        print(f"Default Threshold: {self.default_threshold}")
        
        # --- Adb Platform Examples ---
        # self.platform.click(100, 100, self.deviceId)
        # self.platform.swipe(100, 100, 200, 200, self.deviceId)
        # self.platform.swipe_with_duration(100, 100, 200, 200, 500, self.deviceId)
        # self.platform.type_text("Hello", self.deviceId)
        # self.platform.key_event("KEYCODE_HOME", self.deviceId)
        # self.platform.start_app("com.example.package", self.deviceId)
        # self.platform.stop_app("com.example.package", self.deviceId)
        
        # --- Image Recognition ---
        # mat = self.platform.take_snapshot(self.deviceId)
        # found, point = self.platform.find_image_full("target_image.png", self.deviceId)
        # if found:
        #     self.platform.click(point[0], point[1], self.deviceId)
        
        # --- Click Image Shortcuts ---
        # self.platform.click_image_full("target.png", self.deviceId)
        # self.platform.click_image_with_similar("target.png", 0.9, self.deviceId)
        
        print("Done.")
`, className, validName)
	}

	return os.WriteFile(fullPath, []byte(template), 0644)
}

func (sm *ScriptManager) DeleteScript(scriptID string) error {
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
		return fmt.Errorf("script not found")
	}

	// Safety: Only delete files in script/custom
	// Expect format: script/custom/<name>/<name>.py
	cleanPath := filepath.ToSlash(scriptPath)
	if !strings.HasPrefix(cleanPath, "script/custom/") {
		return fmt.Errorf("cannot delete built-in or non-custom scripts")
	}

	// If it's the new folder structure, scriptPath ends with .py
	// We want to remove the PARENT directory if it matches the script name
	fullPath := filepath.Join(sm.CorePath, scriptPath)

	// Check if parent dir name matches script name (without ext)
	parentDir := filepath.Dir(fullPath)
	scriptName := strings.TrimSuffix(filepath.Base(fullPath), ".py")
	parentName := filepath.Base(parentDir)
	if scriptName == "" || parentName == "" || parentName == "script" || parentName == "custom" {
		return fmt.Errorf("safety check failed: invalid script structure for deletion")
	}

	if scriptName == parentName && strings.HasPrefix(cleanPath, "script/custom/") {
		// It is the new structure, remove the folder
		return os.RemoveAll(parentDir)
	} else {
		// Legacy flat file structure or just safety fallback
		return os.Remove(fullPath)
	}
}

func (sm *ScriptManager) RenameScript(scriptID string, newName string) error {
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
		return fmt.Errorf("script not found")
	}

	// Safety: Only rename scripts in script/custom
	cleanPath := filepath.ToSlash(scriptPath)
	if !strings.HasPrefix(cleanPath, "script/custom/") {
		return fmt.Errorf("cannot rename built-in scripts")
	}

	fullPath := filepath.Join(sm.CorePath, scriptPath)
	scriptDir := filepath.Dir(fullPath)
	targetBaseDir := filepath.Dir(scriptDir)

	validNewName := strings.ReplaceAll(newName, " ", "_")
	validNewName = strings.ReplaceAll(validNewName, "-", "_")

	newDir := filepath.Join(targetBaseDir, validNewName)

	if _, err := os.Stat(newDir); err == nil {
		return fmt.Errorf("CONFLICT_ALREADY_EXISTS:%s", validNewName)
	}

	// 1. Rename the folder
	if err := os.Rename(scriptDir, newDir); err != nil {
		return fmt.Errorf("failed to rename folder: %v", err)
	}

	// 2. Rename the main py file inside: newDir/oldName.py -> newDir/newName.py
	oldPyPath := filepath.Join(newDir, scriptID+".py")
	newPyPath := filepath.Join(newDir, validNewName+".py")

	if _, err := os.Stat(oldPyPath); err == nil {
		if err := os.Rename(oldPyPath, newPyPath); err != nil {
			return fmt.Errorf("failed to rename .py file: %v", err)
		}
	}

	return nil
}

func (sm *ScriptManager) ListAssets(scriptID string) ([]map[string]interface{}, error) {
	scripts, err := sm.ListScripts()
	if err != nil {
		return nil, err
	}

	var scriptPath string
	for _, s := range scripts {
		if s["id"] == scriptID {
			scriptPath = s["path"]
			break
		}
	}

	if scriptPath == "" {
		return nil, fmt.Errorf("script not found")
	}

	// Calculate images dir: script/custom/<name>/images
	fullPath := filepath.Join(sm.CorePath, scriptPath)
	imagesDir := filepath.Join(filepath.Dir(fullPath), "images")

	entries, err := os.ReadDir(imagesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []map[string]interface{}{}, nil
		}
		return nil, err
	}

	var assets []map[string]interface{}
	for _, e := range entries {
		if !e.IsDir() {
			assets = append(assets, map[string]interface{}{
				"name": e.Name(),
				"path": fmt.Sprintf("scripts/%s/assets/%s", scriptID, e.Name()), // Virtual path
			})
		}
	}
	return assets, nil
}

func (sm *ScriptManager) RenameAsset(scriptID, oldName, newName string) error {
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
		return fmt.Errorf("script not found")
	}

	imagesDir := filepath.Join(filepath.Dir(filepath.Join(sm.CorePath, scriptPath)), "images")
	oldPath := filepath.Join(imagesDir, oldName)
	newPath := filepath.Join(imagesDir, newName)

	// Validate paths are within imagesDir
	if filepath.Dir(oldPath) != imagesDir || filepath.Dir(newPath) != imagesDir {
		return fmt.Errorf("invalid asset path")
	}

	if _, err := os.Stat(newPath); err == nil {
		return fmt.Errorf("file already exists")
	}

	return os.Rename(oldPath, newPath)
}

func (sm *ScriptManager) DeleteAsset(scriptID, filename string) error {
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
		return fmt.Errorf("script not found")
	}

	imagesDir := filepath.Join(filepath.Dir(filepath.Join(sm.CorePath, scriptPath)), "images")
	targetPath := filepath.Join(imagesDir, filename)

	// Validate path
	if filepath.Dir(targetPath) != imagesDir {
		return fmt.Errorf("invalid asset path")
	}

	return os.Remove(targetPath)
}

func (sm *ScriptManager) ExportScriptZip(scriptID string, writer io.Writer) error {
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
		return fmt.Errorf("script not found")
	}

	fullPath := filepath.Join(sm.CorePath, scriptPath)
	scriptDir := filepath.Dir(fullPath)

	zw := zip.NewWriter(writer)
	defer zw.Close()

	return filepath.Walk(scriptDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Create path relative to the script directory
		relPath, err := filepath.Rel(scriptDir, path)
		if err != nil {
			return err
		}

		if info.IsDir() {
			if relPath == "." {
				return nil
			}
			_, err = zw.Create(relPath + "/")
			return err
		}

		w, err := zw.Create(relPath)
		if err != nil {
			return err
		}

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		_, err = io.Copy(w, f)
		return err
	})
}

func (sm *ScriptManager) ImportScriptZip(reader io.ReaderAt, size int64, overrideName string) error {
	zr, err := zip.NewReader(reader, size)
	if err != nil {
		return err
	}

	var originalScriptName string
	for _, f := range zr.File {
		// Try to find the main script file at the root of the zip, ignoring __init__.py
		if strings.HasSuffix(f.Name, ".py") && !strings.Contains(f.Name, "/") && f.Name != "__init__.py" {
			originalScriptName = strings.TrimSuffix(f.Name, ".py")
			break
		}
	}

	if originalScriptName == "" {
		// Fallback 1: look for wrapped structure (folder/folder.py)
		for _, f := range zr.File {
			parts := strings.Split(f.Name, "/")
			if len(parts) == 2 && strings.HasSuffix(parts[1], ".py") && parts[0]+".py" == parts[1] && parts[1] != "__init__.py" {
				originalScriptName = parts[0]
				break
			}
		}
	}

	if originalScriptName == "" {
		// Fallback 2: Pick the first .py file that is NOT __init__.py from a single top-level folder
		var topLevelDir string
		for _, f := range zr.File {
			parts := strings.Split(f.Name, "/")
			if len(parts) > 1 {
				if topLevelDir == "" {
					topLevelDir = parts[0]
				} else if topLevelDir != parts[0] {
					topLevelDir = "" // Multiple top-level dirs
					break
				}
			}
		}
		if topLevelDir != "" {
			for _, f := range zr.File {
				parts := strings.Split(f.Name, "/")
				if len(parts) == 2 && parts[0] == topLevelDir && strings.HasSuffix(parts[1], ".py") && parts[1] != "__init__.py" {
					originalScriptName = topLevelDir
					break
				}
			}
		}
	}

	if originalScriptName == "" {
		return fmt.Errorf("invalid script zip: could not find main .py file (note: __init__.py is ignored)")
	}

	scriptName := originalScriptName
	if overrideName != "" {
		scriptName = strings.ReplaceAll(overrideName, " ", "_")
		scriptName = strings.ReplaceAll(scriptName, "-", "_")
	}

	targetDir := filepath.Join(sm.CorePath, "script", "custom", scriptName)
	if _, err := os.Stat(targetDir); err == nil {
		return fmt.Errorf("CONFLICT_ALREADY_EXISTS:%s", scriptName)
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return err
	}

	imagesDir := filepath.Join(targetDir, "images")
	os.MkdirAll(imagesDir, 0755)

	for _, f := range zr.File {
		// Normalize paths: remove top-level folder prefix if present
		cleanName := f.Name
		parts := strings.Split(f.Name, "/")
		if len(parts) > 1 && parts[0] == originalScriptName {
			cleanName = strings.Join(parts[1:], "/")
		}

		if cleanName == "" {
			continue
		}

		// Ensure .py file matches the new script name if overridden
		if strings.HasSuffix(cleanName, ".py") && !strings.Contains(cleanName, "/") {
			cleanName = scriptName + ".py"
		}

		targetPath := filepath.Join(targetDir, cleanName)
		if f.FileInfo().IsDir() {
			os.MkdirAll(targetPath, f.Mode())
			continue
		}

		err = func() error {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			defer rc.Close()

			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				return err
			}

			tf, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
			if err != nil {
				return err
			}
			defer tf.Close()

			_, err = io.Copy(tf, rc)
			return err
		}()

		if err != nil {
			return err
		}
	}

	return nil
}
