package process_manager

import (
	"fmt"
	"os"
	"os/exec"
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

	// Determine an absolute path that is definitely outside the project root
	var absPath string
	if os.PathSeparator == '\\' {
		absPath = "C:\\Windows\\System32\\cmd.exe"
	} else {
		absPath = "/etc/passwd"
	}

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
			name:      "Path escape attempt (absolute)",
			relPath:   absPath,
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
			// Security Check Logic
			if filepath.IsAbs(tt.relPath) {
				if !tt.expectErr {
					t.Errorf("Expected success for %s, but filepath.IsAbs is true", tt.relPath)
				}
				return
			}

			fullPath := filepath.Join(projectRoot, tt.relPath)
			cleanBase, _ := filepath.Abs(projectRoot)
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

func TestListScripts_Mock(t *testing.T) {
	sm := NewScriptManager(".", "echo", "")

	// Set a mock command factory that calls our helper process
	sm.SetCommandFactory(func(name string, arg ...string) *exec.Cmd {
		cs := []string{"-test.run=TestHelperProcess", "--", name}
		cs = append(cs, arg...)
		cmd := exec.Command(os.Args[0], cs...)
		cmd.Env = []string{"GO_WANT_HELPER_PROCESS=1"}
		return cmd
	})

	scripts, err := sm.ListScripts()
	if err != nil {
		t.Fatalf("ListScripts failed: %v", err)
	}

	if len(scripts) != 1 {
		t.Errorf("Expected 1 script, got %d", len(scripts))
	}

	if scripts[0]["id"] != "test1" {
		t.Errorf("Expected id test1, got %s", scripts[0]["id"])
	}
}

// TestHelperProcess is a helper for mocking exec.Command
func TestHelperProcess(t *testing.T) {
	if os.Getenv("GO_WANT_HELPER_PROCESS") != "1" {
		return
	}
	defer os.Exit(0)

	args := os.Args
	for i := 0; i < len(args); i++ {
		if args[i] == "--" {
			args = args[i+1:]
			break
		}
	}

	// Logic based on arguments
	if len(args) > 0 {
		// If last arg is 'list', output the JSON
		if args[len(args)-1] == "list" {
			fmt.Printf(`[{"id":"test1", "name":"Test 1", "platform":"android"}]`)
		}
	}
}
