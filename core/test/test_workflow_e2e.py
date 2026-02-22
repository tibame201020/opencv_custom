import pytest
import subprocess
import os
import sys
import json
import time
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ADB_STUB = PROJECT_ROOT / "tools" / "adb_stub"
BRIDGE_SCRIPT = PROJECT_ROOT / "core" / "workflow_bridge.py"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
ADB_CALLS_LOG = ARTIFACTS_DIR / "adb_calls.jsonl"
FIXTURES_DIR = PROJECT_ROOT / "core" / "test" / "fixtures"

@pytest.fixture(scope="function")
def setup_adb_stub():
    """Setup ADB_BIN environment and clean logs."""
    # Ensure stub is executable
    ADB_STUB.chmod(0o755)

    # Clean log
    if ADB_CALLS_LOG.exists():
        ADB_CALLS_LOG.unlink()

    # Return environment with ADB_BIN
    env = os.environ.copy()
    env["ADB_BIN"] = str(ADB_STUB)
    # Ensure PYTHONPATH includes project root for bridge to find core modules
    env["PYTHONPATH"] = str(PROJECT_ROOT) + os.pathsep + env.get("PYTHONPATH", "")

    return env

def test_workflow_bridge_e2e(setup_adb_stub):
    """
    Test a minimal closed loop:
    1. Start bridge
    2. Init Android platform
    3. Click Image (triggers screencap -> find -> tap)
    4. Verify logs
    """
    env = setup_adb_stub

    # Start bridge
    process = subprocess.Popen(
        [sys.executable, "-u", str(BRIDGE_SCRIPT)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        text=True,
        bufsize=1
    )

    try:
        # Helper to read JSON line
        def read_response():
            line = process.stdout.readline()
            if not line:
                return None
            return json.loads(line)

        def send_request(action, params={}):
            req = {"action": action, "params": params}
            process.stdin.write(json.dumps(req) + "\n")
            process.stdin.flush()

        # 1. Wait for ready
        resp = read_response()
        assert resp is not None, "Bridge did not start"
        assert resp["signal"] == "ready"

        # 2. Init
        send_request("init", {"platform": "android", "device_id": "emulator-5554"})
        resp = read_response()
        assert resp["signal"] == "success"

        # 3. Click Image
        template_path = FIXTURES_DIR / "template.png"
        assert template_path.exists(), "Template fixture missing"

        send_request("click_image", {
            "image": str(template_path),
            "threshold": 0.8,
            "timeout": 5  # short timeout for test
        })

        resp = read_response()
        assert resp["signal"] == "success", f"click_image failed: {resp.get('error')}"
        assert resp["output"].get("success") is True

        # 4. Shutdown
        send_request("shutdown")
        resp = read_response()
        assert resp["signal"] == "success"

    finally:
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()

        # Print stderr if any error occurred
        stderr = process.stderr.read()
        if stderr:
            print(f"Bridge Stderr:\n{stderr}")

    # 5. Verify ADB Calls
    assert ADB_CALLS_LOG.exists()

    calls = []
    with open(ADB_CALLS_LOG, "r") as f:
        for line in f:
            if line.strip():
                calls.append(json.loads(line))

    # Find screencap call
    screencap_idx = -1
    tap_idx = -1

    for i, call in enumerate(calls):
        args = call["args"]
        # Check for screencap
        if "screencap" in args and "exec-out" in args:
            screencap_idx = i

        # Check for tap
        if "tap" in args and "input" in args:
            tap_idx = i

    assert screencap_idx != -1, "Screencap command not found in logs"
    assert tap_idx != -1, "Tap command not found in logs"
    assert screencap_idx < tap_idx, "Screencap must happen before Tap"
