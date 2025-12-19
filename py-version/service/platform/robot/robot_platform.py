"""
Robot 平台服務 - 使用 pyautogui 控制本機桌面
"""
import uuid
import os
from typing import Optional, Tuple
import numpy as np
import pyautogui
from PIL import Image
import cv2
from ..platform_service import PlatformService
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.mat_utility import MatUtility
from service.core.opencv.dto import MatchPattern


class RobotPlatform(PlatformService):
    """Robot 平台服務類別"""
    
    def __init__(self, open_cv_service: OpenCvService):
        super().__init__()
        self.open_cv_service = open_cv_service
    
    def get_open_cv_service(self) -> OpenCvService:
        """取得 OpenCV 服務實例"""
        return self.open_cv_service
    
    def snapshot(self, save_path: str) -> str:
        """
        使用 Robot 截取螢幕快照
        
        Args:
            save_path: 儲存快照影像路徑
            
        Returns:
            儲存的影像絕對路徑
        """
        # 使用 pyautogui 截圖
        screenshot = pyautogui.screenshot()
        # 轉換為 OpenCV 格式並儲存
        screenshot_np = np.array(screenshot)
        screenshot_bgr = cv2.cvtColor(screenshot_np, cv2.COLOR_RGB2BGR)
        cv2.imwrite(save_path, screenshot_bgr)
        return os.path.abspath(save_path)
    
    def find_image(self, target_image_path: str) -> MatchPattern:
        """
        在螢幕上尋找目標影像
        
        Args:
            target_image_path: 目標影像路徑
            
        Returns:
            MatchPattern 物件
        """
        snapshot_image_name = f"{uuid.uuid4()}.png"
        snapshot_path = self.snapshot(snapshot_image_name)
        
        try:
            snapshot_mat = MatUtility.get_mat_from_file(snapshot_path)
            target_mat = MatUtility.get_mat_from_file(target_image_path)
            result = self.open_cv_service.find_match(snapshot_mat, target_mat)
            return result
        finally:
            # 清理臨時檔案
            if os.path.exists(snapshot_path):
                os.remove(snapshot_path)

