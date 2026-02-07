import cv2
import sys
from pathlib import Path

# Setup project root
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from service.platform.robot.robot_platform import RobotPlatform
from service.core.opencv.open_cv_service import OpenCvService

def take_screenshot():
    try:
        service = OpenCvService()
        platform = RobotPlatform(service)
        mat = platform.snapshot()
        if mat is not None:
            # Encode as PNG to stdout
            _, buffer = cv2.imencode('.png', mat)
            sys.stdout.buffer.write(buffer.tobytes())
            return True
    except Exception as e:
        sys.stderr.write(str(e))
    return False

if __name__ == "__main__":
    take_screenshot()
