"""
查找卡厄斯夢境遊戲的 package name
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from service.platform.adb.adb import Adb
from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.open_cv_service import OpenCvService

def find_game_package():
    """查找遊戲 package name"""
    adb = Adb()
    platform = AdbPlatform(adb, OpenCvService())
    device_id = "emulator-5554"
    
    # 獲取當前運行的應用
    print("=== 當前運行的應用 ===")
    try:
        result = adb.exec('platform-tools\\adb.exe -s emulator-5554 shell dumpsys window windows | findstr mCurrentFocus')
        print(result)
    except Exception as e:
        print(f"Error: {e}")
    
    # 列出所有安裝的應用
    print("\n=== 所有安裝的應用 (包含 chaos/dream/夢境/卡厄斯) ===")
    try:
        apps = platform.get_app_list(device_id)
        # 查找可能相關的應用
        keywords = ['chaos', 'dream', '夢境', '卡厄斯', 'czn', 'supercreative']
        for line in apps.split('\n'):
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in keywords):
                print(line)
    except Exception as e:
        print(f"Error: {e}")
    
    # 嘗試截圖看看當前界面
    print("\n=== 截取當前屏幕 ===")
    try:
        snapshot = platform.take_snapshot(device_id)
        if snapshot is not None:
            from service.core.opencv.mat_utility import MatUtility
            MatUtility.write_to_file("current_screen.png", snapshot)
            print("截圖已保存到: current_screen.png")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_game_package()







