"""
Workflow Bridge — stdin/stdout JSON-RPC for Go ↔ Python PlatformService

Protocol:
  - Go writes a JSON line to stdin: {"action":"click","params":{"x":100,"y":200}}
  - Python reads, executes, writes a JSON line to stdout: {"signal":"success","output":{...}}
  - Special action "init" initialises the platform (android/desktop)
  - Special action "shutdown" terminates the process
"""
import sys
import json
import time
import traceback
from pathlib import Path

# Ensure project root is on sys.path
project_root = Path(__file__).parent.resolve()
sys.path.insert(0, str(project_root))

from service.core.opencv.open_cv_service import OpenCvService

# Globals
platform = None
opencv_service = None


def respond(signal: str, output=None, error: str = None):
    """Write a JSON response line to stdout."""
    obj = {"signal": signal}
    if output is not None:
        obj["output"] = output
    if error:
        obj["error"] = error
    line = json.dumps(obj, ensure_ascii=False, default=str)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def handle_init(params: dict):
    """Initialise the PlatformService based on platform type."""
    global platform, opencv_service

    plat_type = params.get("platform", "android").lower()
    device_id = params.get("device_id", None)
    opencv_service = OpenCvService()

    if plat_type == "desktop":
        from service.platform.robot.robot_platform import RobotPlatform
        platform = RobotPlatform(opencv_service)
    else:
        # Android (default)
        from service.platform.adb.adb_platform import AdbPlatform
        from service.platform.adb.adb import Adb
        adb = Adb(device_id)
        if device_id:
            adb.connect()
        platform = AdbPlatform(adb, opencv_service)
        if device_id:
            platform.set_device_id(device_id)

    respond("success", {"platform": plat_type, "device_id": device_id})


def handle_action(action: str, params: dict):
    """Dispatch an action to PlatformService."""
    global platform

    if action == "click":
        result = platform.click(int(params.get("x", 0)), int(params.get("y", 0)))
        respond("success", {"result": result})

    elif action == "swipe":
        result = platform.swipe(
            int(params.get("x1", 0)), int(params.get("y1", 0)),
            int(params.get("x2", 0)), int(params.get("y2", 0)),
            int(params.get("duration_ms", 500))
        )
        respond("success", {"result": result})

    elif action == "type_text":
        result = platform.type_text(params.get("text", ""))
        respond("success", {"result": result})

    elif action == "key_event":
        key = params.get("key", params.get("key_code", ""))
        # Try numeric keycode vs string
        try:
            key = int(key)
        except (ValueError, TypeError):
            pass
        result = platform.key_event(key)
        respond("success", {"result": result})

    elif action == "screenshot":
        mat = platform.snapshot()
        if mat is not None:
            import cv2
            import base64
            _, buf = cv2.imencode(".png", mat)
            b64 = base64.b64encode(buf.tobytes()).decode("ascii")
            respond("success", {"base64": b64, "width": mat.shape[1], "height": mat.shape[0]})
        else:
            respond("error", error="screenshot failed")

    elif action == "sleep":
        ms = int(params.get("duration_ms", 1000))
        time.sleep(ms / 1000.0)
        respond("success", {"slept_ms": ms})

    elif action == "find_image":
        template = params.get("template", params.get("image", ""))
        pos = platform.find_image(
            template,
            region=_parse_region(params.get("region")),
            threshold=float(params.get("threshold", 0.8))
        )
        if pos:
            respond("success", {"found": True, "x": pos[0], "y": pos[1]})
        else:
            respond("success", {"found": False})

    elif action == "click_image":
        template = params.get("template", params.get("image", ""))
        result = platform.click_image(
            template,
            region=_parse_region(params.get("region")),
            threshold=float(params.get("threshold", 0.8))
        )
        respond("success", {"clicked": result})

    elif action == "wait_image":
        template = params.get("template", params.get("image", ""))
        pos = platform.wait_image(
            template,
            timeout=int(params.get("timeout", 10)),
            threshold=float(params.get("threshold", 0.8)),
            region=_parse_region(params.get("region"))
        )
        if pos:
            respond("success", {"found": True, "x": pos[0], "y": pos[1]})
        else:
            respond("success", {"found": False, "timeout": True})

    elif action == "wait_click_image":
        template = params.get("template", params.get("image", ""))
        result = platform.wait_click_image(
            template,
            timeout=int(params.get("timeout", 10)),
            threshold=float(params.get("threshold", 0.8)),
            region=_parse_region(params.get("region"))
        )
        respond("success", {"clicked": result})

    elif action == "ocr_text":
        text = platform.ocr_text(
            params.get("templates_path", ""),
            _parse_region(params.get("region")),
            float(params.get("threshold", 0.8))
        )
        respond("success", {"text": text})

    elif action == "ocr_pattern":
        text = platform.ocr_pattern(
            params.get("templates_path", ""),
            _parse_region(params.get("region")),
            float(params.get("threshold", 0.8))
        )
        respond("success", {"pattern": text})

    elif action == "log":
        msg = params.get("message", "")
        level = params.get("level", "info")
        # Just print to stderr so it doesn't pollute the JSON protocol on stdout
        print(f"[{level.upper()}] {msg}", file=sys.stderr)
        respond("success", {"message": msg, "level": level})

    else:
        respond("error", error=f"unknown action: {action}")


def _parse_region(region_data):
    """Parse region dict into OcrRegion if present."""
    if not region_data:
        return None
    try:
        from service.core.opencv.dto import OcrRegion
        return OcrRegion(
            int(region_data.get("x1", 0)),
            int(region_data.get("y1", 0)),
            int(region_data.get("x2", 0)),
            int(region_data.get("y2", 0))
        )
    except Exception:
        return None


def main():
    """Main loop: read JSON lines from stdin, dispatch, respond on stdout."""
    # Unbuffered stderr for logging
    sys.stderr = open(sys.stderr.fileno(), 'w', buffering=1)

    # Send ready signal
    respond("ready", {"version": "1.0"})

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        try:
            msg = json.loads(line)
        except json.JSONDecodeError as e:
            respond("error", error=f"invalid JSON: {e}")
            continue

        action = msg.get("action", "")
        params = msg.get("params", {})

        try:
            if action == "init":
                handle_init(params)
            elif action == "shutdown":
                respond("success", {"message": "bye"})
                break
            else:
                if platform is None:
                    respond("error", error="platform not initialised, send 'init' first")
                    continue
                handle_action(action, params)
        except Exception as e:
            respond("error", error=f"{action} failed: {str(e)}\n{traceback.format_exc()}")

    sys.exit(0)


if __name__ == "__main__":
    main()
