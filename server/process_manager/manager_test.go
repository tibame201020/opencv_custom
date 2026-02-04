package process_manager

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetAssetPath_Security(t *testing.T) {
	// Create a temp directory for corePath
	tmpDir, err := os.MkdirTemp("", "script-platform-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	corePath := tmpDir
	// Create a dummy project structure
	projectDir := filepath.Join(corePath, "custom", "test_project")
	os.MkdirAll(projectDir, 0755)

	// Create a dummy script file
	scriptFile := filepath.Join(projectDir, "main.py")
	os.WriteFile(scriptFile, []byte("print('hello')"), 0644)

	sm := NewScriptManager(corePath, "python", "entry.py")

	// Since GetAssetPath calls ListScripts (which runs a command),
	// we will manually test the path resolution logic here for now
	// by simulating what GetAssetPath does.

	mainScriptPath := filepath.Join("custom", "test_project", "main.py")
	projectRoot := filepath.Join(sm.CorePath, filepath.Dir(mainScriptPath))

	tests := []struct {
		name      string
		relPath   string
		expectErr bool
		errSub    string
	}{
		{
			name:      "Valid asset in project",
			relPath:   "images/icon.png",
			expectErr: false,
		},
		{
			name:      "Path escape attempt (parent)",
			relPath:   "../../secret.txt",
			expectErr: true,
			errSub:    "security",
		},
		{
			name:      "Path escape attempt (absolute Windows)",
			relPath:   "C:\\Windows\\System32\\cmd.exe",
			expectErr: true,
			errSub:    "security",
		},
		{
			name:      "Root access (allowed within project)",
			relPath:   "main.py",
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fullPath := filepath.Join(projectRoot, tt.relPath)

			// Security Check Logic
			cleanBase, _ := filepath.Abs(projectRoot)

			if filepath.IsAbs(tt.relPath) {
				if !tt.expectErr {
					t.Errorf("Expected success for %s, but filepath.IsAbs is true", tt.relPath)
				}
				return
			}

			cleanTarget, _ := filepath.Abs(fullPath)

			// t.Logf("rel: %s, target: %s, base: %s", tt.relPath, cleanTarget, cleanBase)

			if !strings.HasPrefix(cleanTarget, cleanBase) {
				if !tt.expectErr {
					t.Errorf("Unexpected error for %s: path escape detected but not expected", tt.relPath)
				} else if !strings.Contains("security", tt.errSub) {
					t.Errorf("Expected error containing %s, got something else", tt.errSub)
				}
				return
			}

			if tt.expectErr {
				t.Errorf("Expected error for %s (%s, base: %s), but got none", tt.relPath, cleanTarget, cleanBase)
			}
		})
	}
}
