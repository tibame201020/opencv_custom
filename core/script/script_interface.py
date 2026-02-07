"""
Script Interface - 腳本介面
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
import os


class ScriptInterface(ABC):
    """腳本介面 - 基於 PlatformService 抽象"""
    
    def __init__(self, platform: "PlatformService"):
        self.platform = platform
        
        # 圖片搜尋路徑與參數設定
        import sys
        try:
            # 獲取子類所在的目錄，預設圖片放在那裡的 images 資料夾
            script_dir = Path(sys.modules[self.__module__].__file__).parent.resolve()
            self.image_root: str = str(script_dir / "images")
        except:
            self.image_root: str = "images"
            
        self.default_threshold: float = 0.8
        # 相容性支持
        self.deviceId: Optional[str] = platform.device_id
    
    @abstractmethod
    def execute(self) -> None:
        """執行腳本邏輯"""
        pass

    # --- 快捷代理方法 (使開發腳本更簡潔) ---

    def click(self, x: int, y: int):
        return self.platform.click(x, y)

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 500):
        return self.platform.swipe(x1, y1, x2, y2, duration)

    def find(self, image_name: str, threshold: float = None, region: "OcrRegion" = None):
        """在預設目錄搜尋圖片"""
        threshold = threshold or self.default_threshold
        path = os.path.join(self.image_root, image_name)
        return self.platform.find_image(path, region=region, threshold=threshold)

    def tap(self, image_name: str, threshold: float = None, region: "OcrRegion" = None):
        """搜尋並點擊"""
        threshold = threshold or self.default_threshold
        path = os.path.join(self.image_root, image_name)
        return self.platform.click_image(path, region=region, threshold=threshold)

    def wait_tap(self, image_name: str, timeout: int = 10, threshold: float = None, region: "OcrRegion" = None):
        """等待圖片出現並點擊"""
        threshold = threshold or self.default_threshold
        path = os.path.join(self.image_root, image_name)
        return self.platform.wait_click_image(path, timeout=timeout, threshold=threshold, region=region)

    def ocr_text(self, templates_relative_path: str, region: "OcrRegion", threshold: float = 0.8):
        """進行文字辨識"""
        path = os.path.join(self.image_root, templates_relative_path)
        return self.platform.ocr_text(path, region, threshold)

    def ocr_pattern(self, templates_relative_path: str, region: "OcrRegion", threshold: float = 0.8):
        """進行圖案辨識"""
        path = os.path.join(self.image_root, templates_relative_path)
        return self.platform.ocr_pattern(path, region, threshold)

    def sleep(self, seconds: float):
        self.platform.sleep(seconds)

    def log(self, message: str, type: str = "info"):
        """輸出 JSON Log (由 entry.py 攔截)"""
        print(f"[{type.upper()}] {message}")