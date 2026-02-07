import argparse
import sys
import json
import time
import datetime
import random
import io
import importlib
from pathlib import Path

# 確定專案根目錄 (處理 PyInstaller 凍結路徑問題)
if getattr(sys, 'frozen', False):
    # 如果是打包後的執行檔，__file__ 在暫存目錄，我們需要外部的 core 目錄
    # 執行檔位於 ScriptPlatform-Windows/script-engine.exe
    # 而 core 目錄位於 ScriptPlatform-Windows/core/
    project_root = Path(sys.executable).parent / "core"
else:
    # 開發模式
    project_root = Path(__file__).parent

# 強制 stdout 使用 UTF-8 編碼，避免在 Windows 下出現編碼錯誤
if sys.stdout.encoding != 'UTF-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, str(project_root))

# Import existing Run Logic
try:
    from service.core.opencv.open_cv_service import OpenCvService
    from service.platform.adb.adb import Adb
    from service.platform.adb.adb_platform import AdbPlatform
    from service.platform.robot.robot_platform import RobotPlatform
except ImportError as e:
    # Fallback for when dependencies aren't fully set up in this environment
    pass

# --- JSON Logger Wrapper ---
class JsonLogger(io.TextIOWrapper):
    def __init__(self, original_stdout):
        self.original_stdout = original_stdout
        # Initialize with a dummy buffer since TextIOWrapper requires one, or just inherit/delegate
        
    def write(self, message):
        if message.strip():
            self.log(message.strip())

    def flush(self):
        self.original_stdout.flush()

    def log(self, message, type="info"):
        timestamp = datetime.datetime.now().isoformat()
        
        # Check if message looks like an error
        if "error" in message.lower() or "exception" in message.lower():
            type = "error"
        elif "success" in message.lower():
            type = "success"
            
        entry = {
            "timestamp": timestamp,
            "type": type,
            "message": message
        }
        self.original_stdout.write(json.dumps(entry) + "\n")
        self.original_stdout.flush()

# Redirect stdout
# sys.stdout = JsonLogger(sys.stdout) <-- This might be too aggressive if scripts print non-string stuff.
# Better approach: Use a helper function for new code, and maybe monkey patch built-in print if needed.
# For now, let's keep the helper `log` function and try to use it where possible, 
# or just intercept stdout at a higher level if we can. 
# actually, the simplest way to support legacy scripts that use `print` is to replace sys.stdout.

class StdoutHook:
    def __init__(self):
        self.original_stdout = sys.stdout

    def write(self, text):
        if not text.strip(): return
        
        timestamp = datetime.datetime.now().isoformat()
        msg_type = "info"
        if "error" in text.lower(): msg_type = "error"
        
        entry = {
            "timestamp": timestamp,
            "type": msg_type,
            "message": text.strip()
        }
        self.original_stdout.write(json.dumps(entry) + "\n")
        self.original_stdout.flush()

    def flush(self):
        self.original_stdout.flush()

# --- Script Runners (Ported from run_script.py) ---

def run_test_log():
    """Simulates a task with verbose logging"""
    print("Starting Test Log Stream...")
    time.sleep(0.5)
    print("Initializing virtual environment...")
    time.sleep(0.5)
    
    devices = ["emulator-5554", "emulator-5556", "192.168.1.101:5555"]
    
    for i in range(1, 100):
        if i % 10 == 0:
            print(f"Checkpoint {i}/100 passed")
        elif i % 25 == 0:
            print(f"Warning: High memory usage detected")
        elif i % 7 == 0:
            print(f"Connecting to device {random.choice(devices)}...")
            time.sleep(0.2)
            print("Connected successfully.")
        else:
            print(f"Processing batch {i} -> item {random.randint(1000, 9999)}")
        
        time.sleep(random.uniform(0.5, 1.5))
    
    print("Task completed successfully.")

# --- CLI Commands ---

def cmd_list(args):
    scripts = []

    # Scan custom scripts
    custom_dir = project_root / "script" / "custom"
    if custom_dir.exists():
        # Check both files and directories
        for path in custom_dir.iterdir():
            if path.name == "__init__.py": continue
            
            script_id = path.stem
            platform = "android"
            script_path = ""
            
            if path.is_file() and path.suffix == ".py":
                # Legacy: script/custom/foo.py
                script_path = f"script/custom/{path.name}"
                try:
                   content = path.read_text(encoding='utf-8')
                   if "RobotPlatform" in content: platform = "desktop"
                except: pass
            
            elif path.is_dir():
                # New: script/custom/foo/foo.py
                inner_file = path / f"{path.name}.py"
                if inner_file.exists():
                    script_path = f"script/custom/{path.name}/{path.name}.py"
                    try:
                       content = inner_file.read_text(encoding='utf-8')
                       if "RobotPlatform" in content: platform = "desktop"
                    except: pass
            
            if script_path:
                scripts.append({
                    "id": script_id,
                    "name": script_id.capitalize(),
                    "platform": platform,
                    "description": "User custom script",
                    "path": script_path
                })

    # We output the list raw JSON, NOT triggering the hook because LIST command result is parsed by backend
    # We use ensure_ascii=False to support Chinese characters
    print(json.dumps(scripts, ensure_ascii=False))

def cmd_run(args):
    """Run a specific script"""
    # Enable JSON Logging for execution
    sys.stdout = StdoutHook()

    script_id = args.script
    params_dict = {}
    try:
        params_dict = json.loads(args.params)
    except:
        pass
    
    try:
        if script_id == "test_log":
            run_test_log()
            return
            
        # Try to load dynamic custom script
        # Check for New Structure: script/custom/<id>/<id>.py
        new_struct_path = project_root / "script" / "custom" / script_id / f"{script_id}.py"
        # Check for Old Structure: script/custom/<id>.py
        old_struct_path = project_root / "script" / "custom" / f"{script_id}.py"
        
        module_name = ""
        if new_struct_path.exists():
             module_name = f"script.custom.{script_id}.{script_id}"
        elif old_struct_path.exists():
             module_name = f"script.custom.{script_id}"
        
        if module_name:
            module = importlib.import_module(module_name)
            
            # Find the Script class (ends with 'Script')
            script_class = None
            for attr_name in dir(module):
                if attr_name.endswith("Script") and attr_name not in ["ScriptInterface", "Script"]:
                    script_class = getattr(module, attr_name)
                    break
            
            if not script_class:
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, type) and hasattr(attr, 'execute'):
                        script_class = attr
                        break
                        
            if script_class:
                # Heuristic: Determine platform
                is_desktop = False
                script_file_path = new_struct_path if new_struct_path.exists() else old_struct_path
                try:
                    content = script_file_path.read_text(encoding='utf-8')
                    if "RobotPlatform" in content or "pyautogui" in content:
                        is_desktop = True
                except: pass
                
                print(f"Running v2.1.0 script: {script_id} (Platform: {'Desktop' if is_desktop else 'Android'})")
                open_cv_service = OpenCvService()
                
                if is_desktop:
                    from service.platform.robot.robot_platform import RobotPlatform
                    platform = RobotPlatform(open_cv_service)
                else:
                    from service.platform.adb.adb_platform import AdbPlatform
                    from service.platform.adb.adb import Adb
                    
                    device_id = params_dict.get("deviceId")
                    adb = Adb(device_id)
                    if device_id:
                        print(f"Target Device: {device_id}")
                        adb.connect()
                    
                    platform = AdbPlatform(adb, open_cv_service)
                    # Inject deviceId for backward compatibility
                    if device_id:
                        platform.set_device_id(device_id)
                
                # Instantiate and run
                script_instance = script_class(platform)
                
                # Support Legacy attribute injection
                if not is_desktop and 'device_id' in locals() and device_id:
                    script_instance.deviceId = device_id
                
                # Execute
                script_instance.execute()
                return

        print(f"Unknown script: {script_id}")
        sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nScript stopped by user.")
    except Exception as e:
        print(f"Script Error: {str(e)}")
        import traceback
        traceback.print_exc(file=sys.stdout)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Script Runner Entry Point")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    subparsers.add_parser("list", help="List available scripts")

    run_parser = subparsers.add_parser("run", help="Run a script")
    run_parser.add_argument("--script", required=True, help="Script ID to run")
    run_parser.add_argument("--params", default="{}", help="JSON params")

    args = parser.parse_args()

    # Default to hook unless list command
    # Actually simpler to set hook inside cmd_run

    if args.command == "list":
        cmd_list(args)
    elif args.command == "run":
        cmd_run(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
