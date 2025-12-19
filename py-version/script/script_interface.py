"""
Script Interface - 腳本介面
"""
from abc import ABC, abstractmethod
from typing import Optional


class ScriptInterface(ABC):
    """腳本介面"""
    
    def __init__(self):
        # 預設設定，可由子類 override
        self.image_root: str = "images"  # 圖片根目錄，相對於 script 目錄
        self.default_threshold: float = 0.8  # 預設辨識度閾值
    
    @abstractmethod
    def execute(self) -> None:
        """執行腳本"""
        pass
    
    def configure(self) -> None:
        """配置設定，子類可 override 以自訂設定"""
        pass