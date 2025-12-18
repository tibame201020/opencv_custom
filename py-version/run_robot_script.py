"""
執行 Robot 腳本的入口點
"""
import sys
from pathlib import Path

# 添加專案根目錄到 Python 路徑
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from service.core.opencv.open_cv_service import OpenCvService
from service.platform.robot.robot_platform import RobotPlatform
from script.robot.robot_script import RobotScript


def main():
    """主程式"""
    # 初始化服務
    open_cv_service = OpenCvService()
    robot_platform = RobotPlatform(open_cv_service)
    
    # 執行腳本
    robot_script = RobotScript(robot_platform)
    robot_script.execute()


if __name__ == "__main__":
    main()


