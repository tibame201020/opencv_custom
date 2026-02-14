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
	if err := cmd.Process.Kill(); err != nil {
		// Ignore "process already finished" error
		if err.Error() == "os: process already finished" {
			return nil
		}
		return err
	}
	return nil
}
