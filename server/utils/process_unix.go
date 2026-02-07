//go:build !windows
// +build !windows

package utils

import (
	"os/exec"
)

func HideConsole(cmd *exec.Cmd) {
	// Do nothing on non-windows
}

func KillProcess(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	return cmd.Process.Kill()
}
