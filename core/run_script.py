"""
通用腳本執行器
支援執行不同的腳本
"""
import sys
from pathlib import Path

# 添加專案根目錄到 Python 路徑
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from service.core.opencv.open_cv_service import OpenCvService
from service.platform.adb.adb import Adb
from service.platform.adb.adb_platform import AdbPlatform
from service.platform.robot.robot_platform import RobotPlatform


def run_robot_script():
    """執行 Robot 腳本"""
    from script.robot.robot_script import RobotScript
    
    open_cv_service = OpenCvService()
    robot_platform = RobotPlatform(open_cv_service)
    robot_script = RobotScript(robot_platform)
    robot_script.execute()


def run_gear_script():
    """執行 Gear 腳本"""
    from script.gearScript.gear_script import GearScript
    
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    gear_script = GearScript(adb_platform)
    gear_script.execute()


def run_evil_hunter_script():
    """執行 Evil Hunter 腳本"""
    from script.evilHunter.evil_hunter_script import EvilHunterScript
    
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    evil_hunter_script = EvilHunterScript(adb_platform)
    evil_hunter_script.execute()


def run_chaos_dream_script():
    """執行卡厄斯夢境腳本"""
    from script.chaosDream.chaos_dream_script import ChaosDreamScript
    
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    chaos_dream_script = ChaosDreamScript(adb_platform)
    chaos_dream_script.execute()


def run_adb_script():
    """執行 ADB 腳本範例"""
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    
    # 列出裝置
    devices = adb_platform.get_devices()
    print(f"找到 {len(devices)} 個裝置: {devices}")
    
    if devices:
        device_id = devices[0]
        print(f"使用裝置: {device_id}")
        # 可以在這裡執行其他 ADB 操作
    else:
        print("未找到任何裝置")


def main():
    """主程式"""
    if len(sys.argv) > 1:
        script_name = sys.argv[1]
        if script_name == "robot":
            run_robot_script()
        elif script_name == "gear":
            run_gear_script()
        elif script_name == "evil-hunter":
            run_evil_hunter_script()
        elif script_name == "chaos-dream":
            run_chaos_dream_script()
        elif script_name == "adb":
            run_adb_script()
        else:
            print(f"未知的腳本: {script_name}")
            print("可用的腳本: robot, gear, evil-hunter, chaos-dream, adb")
    else:
        # 預設執行 Robot 腳本
        print("未指定腳本，執行 Robot 腳本...")
        run_robot_script()


if __name__ == "__main__":
    main()


