"""
平台服務介面
"""
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..core.opencv.open_cv_service import OpenCvService


class PlatformService(ABC):
    """平台服務抽象類別"""
    
    def __init__(self):
        self.device_id: Optional[str] = None  # 裝置 ID，ADB 平台需要
    
    @abstractmethod
    def get_open_cv_service(self) -> "OpenCvService":
        """
        取得 OpenCV 服務實例
        
        Returns:
            OpenCvService 實例
        """
        pass
    
    def set_device_id(self, device_id: str) -> None:
        """
        設定裝置 ID（ADB 平台使用）
        
        Args:
            device_id: 裝置 ID
        """
        self.device_id = device_id

