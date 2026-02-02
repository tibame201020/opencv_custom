"""
Script Interface - 腳本介面
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


class ScriptInterface(ABC):
    """腳本介面"""
    
    def __init__(self):
        # 預設設定，可由子類 override
        # 計算 script 目錄的絕對路徑，然後指向 script/images
        script_dir = Path(__file__).parent.resolve()  # py-version/script
        self.image_root: str = str(script_dir / "images")  # 圖片根目錄，相對於 script 目錄
        self.default_threshold: float = 0.8  # 預設辨識度閾值
        self.deviceId: Optional[str] = None  # 裝置 ID (注入)
    
    @abstractmethod
    def execute(self) -> None:
        """執行腳本"""
        pass
    
    def configure(self) -> None:
        """配置設定，子類可 override 以自訂設定"""
        pass