import argparse
import sys
import json
import traceback
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import Services
try:
    from service.core.opencv.open_cv_service import OpenCvService
    from service.platform.adb.adb import Adb
    from service.platform.adb.adb_platform import AdbPlatform
    from service.platform.robot.robot_platform import RobotPlatform
except ImportError as e:
    print(json.dumps({"type": "error", "message": f"Import Error: {e}"}))
    sys.exit(1)

def get_available_scripts():
    """Return list of available scripts"""
    return [
        {"id": "robot", "name": "Robot Script (Desktop)", "platform": "desktop"},
        {"id": "gear", "name": "Gear Script", "platform": "android"},
        {"id": "evil-hunter", "name": "Evil Hunter", "platform": "android"},
        {"id": "chaos-dream", "name": "Chaos Dream", "platform": "android"},
        {"id": "adb-test", "name": "ADB Test", "platform": "android"},
    ]

def run_script(script_id, params=None):
    """Dispatch script execution"""
    print(json.dumps({"type": "status", "message": f"Starting script: {script_id}"}), flush=True)
    
    try:
        if script_id == "robot":
            from script.robot.robot_script import RobotScript
            cv_service = OpenCvService()
            platform = RobotPlatform(cv_service)
            script = RobotScript(platform)
            script.execute()
            
        elif script_id == "gear":
            from script.gearScript.gear_script import GearScript
            cv_service = OpenCvService()
            adb = Adb()
            platform = AdbPlatform(adb, cv_service)
            script = GearScript(platform)
            script.execute()
            
        elif script_id == "evil-hunter":
            from script.evilHunter.evil_hunter_script import EvilHunterScript
            cv_service = OpenCvService()
            adb = Adb()
            platform = AdbPlatform(adb, cv_service)
            script = EvilHunterScript(platform)
            script.execute()

        elif script_id == "chaos-dream":
            from script.chaosDream.chaos_dream_script import ChaosDreamScript
            cv_service = OpenCvService()
            adb = Adb()
            platform = AdbPlatform(adb, cv_service)
            script = ChaosDreamScript(platform)
            script.execute()

        elif script_id == "adb-test":
             cv_service = OpenCvService()
             adb = Adb()
             platform = AdbPlatform(adb, cv_service)
             devices = platform.get_devices()
             print(json.dumps({"type": "result", "data": {"devices": devices}}), flush=True)

        else:
            raise ValueError(f"Unknown script: {script_id}")

        print(json.dumps({"type": "status", "message": "Script execution completed"}), flush=True)

    except Exception as e:
        error_msg = f"Execution failed: {str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"type": "error", "message": error_msg}), flush=True)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["list", "run"], help="Command")
    parser.add_argument("--script", help="Script ID to run")
    parser.add_argument("--params", help="JSON string params")
    
    args = parser.parse_args()
    
    if args.command == "list":
        print(json.dumps(get_available_scripts()), flush=True)
    elif args.command == "run":
        if not args.script:
            print(json.dumps({"type": "error", "message": "Missing --script argument"}), flush=True)
            sys.exit(1)
        
        params = {}
        if args.params:
            try:
                params = json.loads(args.params)
            except json.JSONDecodeError:
                pass
                
        run_script(args.script, params)

if __name__ == "__main__":
    main()
