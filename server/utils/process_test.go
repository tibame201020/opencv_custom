package utils

import (
	"os/exec"
	"runtime"
	"testing"
)

func TestKillProcess_Alive(t *testing.T) {
	// Start a process that will stay alive for a bit
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "127.0.0.1", "-n", "10")
	} else {
		cmd = exec.Command("sleep", "10")
	}

	HideConsole(cmd)
	if err := cmd.Start(); err != nil {
		t.Fatalf("Failed to start test process: %v", err)
	}

	// Ensure it's running
	if cmd.Process == nil {
		t.Fatal("Process not started")
	}

	// Kill it
	if err := KillProcess(cmd); err != nil {
		t.Errorf("KillProcess failed for alive process: %v", err)
	}

	// Wait for cleanup
	err := cmd.Wait()
	if err == nil {
		t.Error("Process exited cleanly, expected it to be killed")
	}
}

func TestKillProcess_AlreadyDead(t *testing.T) {
	// Start a process that exits immediately
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd", "/c", "exit 0")
	} else {
		cmd = exec.Command("true")
	}

	HideConsole(cmd)
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to run test process: %v", err)
	}

	// At this point cmd.Process.Pid still exists, but the process is dead.
	// taskkill should return 128, which our code should ignore.
	if err := KillProcess(cmd); err != nil {
		t.Errorf("KillProcess failed for dead process: %v. Should ignore 'not found' error.", err)
	}
}

func TestKillProcess_Nil(t *testing.T) {
	// Should handle nil gracefully
	if err := KillProcess(nil); err != nil {
		t.Errorf("KillProcess failed for nil cmd: %v", err)
	}

	cmd := &exec.Cmd{}
	if err := KillProcess(cmd); err != nil {
		t.Errorf("KillProcess failed for unstarted cmd: %v", err)
	}
}
