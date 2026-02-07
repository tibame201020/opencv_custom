"""
Robot 平台服務 - 使用 pyautogui 控制本機桌面
"""
import uuid
import os
from typing import Optional, Tuple, Union
import numpy as np
import pyautogui
from PIL import Image
import cv2
from ..platform_service import PlatformService
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.mat_utility import MatUtility
from service.core.opencv.dto import MatchPattern


class RobotPlatform(PlatformService):
    """Robot 平台服務類別 (Desktop)"""
    
    def __init__(self, open_cv_service: OpenCvService):
        super().__init__(open_cv_service)
        # 停用 pyautogui 的安全故障 (自定義腳本可能需要移動到角落)
        pyautogui.FAILSAFE = False
    
    # --- 平台生命週期 ---
    
    def start(self) -> bool:
        return True

    def stop(self) -> bool:
        return True

    # --- 平台原子操作實作 ---

    def snapshot(self) -> Optional[np.ndarray]:
        """獲取螢幕截圖 Mat (BGR 格式)"""
        try:
            screenshot = pyautogui.screenshot()
            screenshot_np = np.array(screenshot)
            # RGB 轉 BGR
            return cv2.cvtColor(screenshot_np, cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"[Robot] Snapshot failed: {e}")
            return None

    def click(self, x: int, y: int) -> bool:
        """點擊本機座標"""
        try:
            pyautogui.click(x, y)
            return True
        except Exception:
            return False

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 500) -> bool:
        """模擬拖曳/滑動"""
        try:
            # duration 轉為秒
            pyautogui.moveTo(x1, y1)
            pyautogui.dragTo(x2, y2, duration=duration/1000.0)
            return True
        except Exception:
            return False

    def type_text(self, text: str) -> bool:
        """模擬鍵盤文字輸入"""
        try:
            pyautogui.write(text)
            return True
        except Exception:
            return False

    def key_event(self, key_code: Union[int, str]) -> bool:
        """模擬按鍵事件"""
        try:
            # pyautogui.press 支援 'enter', 'esc' 等字串
            pyautogui.press(str(key_code))
            return True
        except Exception:
            return False

