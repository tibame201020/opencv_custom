//go:build windows
// +build windows

package utils

import (
	"fmt"
	"os/exec"
	"syscall"
)

func HideConsole(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
}

func KillProcess(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	// Use taskkill to kill the process and all its children (/T) forcefully (/F)
	killCmd := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", cmd.Process.Pid))
	HideConsole(killCmd)
	err := killCmd.Run()
	if err != nil {
		// taskkill returns 128 if the process is already dead, which is effectively a success for us
		if exitError, ok := err.(*exec.ExitError); ok {
			if exitError.ExitCode() == 128 {
				return nil
			}
		}
		return err
	}
	return nil
}
