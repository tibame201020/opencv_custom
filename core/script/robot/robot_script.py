"""
Robot 測試腳本
"""
from service.platform.robot.robot_platform import RobotPlatform


class RobotScript:
    """Robot 測試腳本"""
    
    def __init__(self, robot_platform: RobotPlatform):
        self.robot_platform = robot_platform
    
    def execute(self) -> None:
        """執行腳本"""
        test_snapshot = "robot-snapshot.png"
        snapshot_path = self.robot_platform.snapshot(test_snapshot)
        print(snapshot_path)
        
        result = self.robot_platform.find_image(test_snapshot)
        print(f"x: {result.point[0]}, y: {result.point[1]}")

