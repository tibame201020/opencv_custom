import argparse
import sys
import json
import time
import datetime
import random
import io
import importlib
from pathlib import Path

# 添加專案根目錄到 Python 路徑
project_root = Path(__file__).parent
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

def run_robot_script():
    from script.robot.robot_script import RobotScript
    open_cv_service = OpenCvService()
    robot_platform = RobotPlatform(open_cv_service)
    robot_script = RobotScript(robot_platform)
    robot_script.execute()

def run_gear_script():
    from script.gearScript.gear_script import GearScript
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    gear_script = GearScript(adb_platform)
    gear_script.execute()

def run_evil_hunter_script():
    from script.evilHunter.evil_hunter_script import EvilHunterScript
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    evil_hunter_script = EvilHunterScript(adb_platform)
    evil_hunter_script.execute()

def run_chaos_dream_script():
    from script.chaosDream.chaos_dream_script import ChaosDreamScript
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    chaos_dream_script = ChaosDreamScript(adb_platform)
    chaos_dream_script.execute()

def run_adb_test():
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    devices = adb_platform.get_devices()
    print(f"Found {len(devices)} devices: {devices}")

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
    scripts = [
        {"id": "test_log", "name": "Test: Log Stream", "platform": "desktop", "description": "Generates continuous logs for testing", "path": "entry.py"}, 
        {"id": "robot", "name": "Robot Script", "platform": "desktop", "description": "Robot automation", "path": "script/robot/robot_script.py"},
        {"id": "gear", "name": "Gear Script", "platform": "android", "description": "Farms gear", "path": "script/gearScript/gear_script.py"},
        {"id": "evil_hunter", "name": "Evil Hunter", "platform": "android", "description": "Auto-combat script", "path": "script/evilHunter/evil_hunter_script.py"},
        {"id": "chaos_dream", "name": "Chaos Dream", "platform": "android", "description": "Dungeon crawler", "path": "script/chaosDream/chaos_dream_script.py"},
        {"id": "adb_test", "name": "ADB Connectivity", "platform": "android", "description": "Check ADB status", "path": "script/script.py"},
    ]

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
    # So we temporarily restore stdout or just use sys.__stdout__
    sys.stdout = sys.__stdout__
    print(json.dumps(scripts))

def cmd_run(args):
    """Run a specific script"""
    # Enable JSON Logging for execution
    sys.stdout = StdoutHook()

    script_id = args.script
    
    try:
        if script_id == "test_log":
            run_test_log()
        elif script_id == "robot":
            run_robot_script()
        elif script_id == "gear":
            run_gear_script()
        elif script_id == "evil_hunter":
            run_evil_hunter_script()
        elif script_id == "chaos_dream":
            run_chaos_dream_script()
        elif script_id == "adb_test":
            run_adb_test()
        else:
            # Try to load dynamic custom script
            try:
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
                    
                    # Find class that ends with 'Script'
                    script_class = None
                    for attr_name in dir(module):
                        if attr_name.endswith("Script") and attr_name != "ScriptInterface":
                            script_class = getattr(module, attr_name)
                            break
                    
                    if not script_class:
                        # Fallback: look for a class that has 'execute' method
                        for attr_name in dir(module):
                            attr = getattr(module, attr_name)
                            if isinstance(attr, type) and hasattr(attr, 'execute'):
                                script_class = attr
                                break
                                
                    if script_class:
                        # Determine platform based on imports or class attributes
                        # Simple heuristic: Check if RobotPlatform is imported in the module
                        is_desktop = False
                        if "RobotPlatform" in dir(module):
                            is_desktop = True
                        
                        # Or check source code text for robustness
                        # (Since imports might be aliased)
                        
                        print(f"Running custom script: {script_id} (Platform: {'Desktop' if is_desktop else 'Android'})")
                        open_cv_service = OpenCvService()
                        
                        if is_desktop:
                            from service.platform.robot.robot_platform import RobotPlatform
                            robot_platform = RobotPlatform(open_cv_service)
                            script_instance = script_class(robot_platform)
                        else:
                            # Parse params to get device_id
                            import json
                            params_dict = {}
                            try:
                                params_dict = json.loads(args.params)
                            except:
                                pass
                            
                            device_id = params_dict.get("deviceId")
                            adb = Adb(device_id)
                            if device_id:
                                print(f"Connecting to device: {device_id}")
                                adb.connect()
                                
                            adb_platform = AdbPlatform(adb, open_cv_service)
                            script_instance = script_class(adb_platform)
                            
                        # Inject deviceId if available
                        if 'device_id' in locals() and device_id:
                            script_instance.deviceId = device_id
                            
                        script_instance.execute()
                        return

                print(f"Unknown script: {script_id}")
                sys.exit(1)
            except ImportError as ie:
                 print(f"Failed to import custom script {script_id}: {ie}")
                 import traceback
                 traceback.print_exc(file=sys.stdout)
                 sys.exit(1)
    except KeyboardInterrupt:
        print("Script stopped by user.")
    except Exception as e:
        print(f"Script Error: {str(e)}")
        import traceback
        traceback.print_exc(file=sys.stdout)

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
