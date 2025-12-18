"""
主程式入口
"""
from service.core.opencv.open_cv_service import OpenCvService
from service.platform.adb.adb import Adb
from service.platform.adb.adb_platform import AdbPlatform
from service.platform.robot.robot_platform import RobotPlatform
from script.robot.robot_script import RobotScript


def main():
    """主程式"""
    # 初始化服務
    open_cv_service = OpenCvService()
    adb = Adb()
    adb_platform = AdbPlatform(adb, open_cv_service)
    robot_platform = RobotPlatform(open_cv_service)
    
    # 執行腳本（預設執行 GearScript，這裡先執行 RobotScript 作為範例）
    robot_script = RobotScript(robot_platform)
    robot_script.execute()


if __name__ == "__main__":
    main()

