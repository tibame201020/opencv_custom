"""
平台服務介面
"""
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.opencv.open_cv_service import OpenCvService


class PlatformService(ABC):
    """平台服務抽象類別"""
    
    @abstractmethod
    def get_open_cv_service(self) -> "OpenCvService":
        """
        取得 OpenCV 服務實例
        
        Returns:
            OpenCvService 實例
        """
        pass

