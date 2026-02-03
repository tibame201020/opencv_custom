//go:build !windows
// +build !windows

package utils

import (
	"os/exec"
)

func HideConsole(cmd *exec.Cmd) {
	// Do nothing on non-windows
}
