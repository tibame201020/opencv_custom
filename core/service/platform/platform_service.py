"""
平台服務抽象基類 - 定義跨平台操作接口
"""
import time
import os
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, TYPE_CHECKING, Union
import numpy as np
from pathlib import Path

# 防止循環引用，僅在型別檢查時導入
if TYPE_CHECKING:
    from ..core.opencv.open_cv_service import OpenCvService
    from ..core.opencv.dto import MatchPattern, OcrRegion

class PlatformService(ABC):
    """平台服務虛擬基類"""
    
    def __init__(self, open_cv_service: "OpenCvService"):
        self.open_cv_service = open_cv_service
        self.device_id: Optional[str] = None
        self._project_root: Optional[Path] = None

    # --- 生命週期與設定 ---
    
    @abstractmethod
    def start(self) -> bool:
        """啟動平台服務"""
        pass

    @abstractmethod
    def stop(self) -> bool:
        """停止平台服務"""
        pass

    def set_device_id(self, device_id: str) -> None:
        """設定裝置 ID（如 ADB 序號）"""
        self.device_id = device_id

    def get_open_cv_service(self) -> "OpenCvService":
        """取得相關聯的 OpenCV 服務"""
        return self.open_cv_service

    # --- 平台原子操作 (需由子類實作) ---

    @abstractmethod
    def snapshot(self) -> Optional[np.ndarray]:
        """獲取當前螢幕截圖 Mat (BGR 格式)"""
        pass

    @abstractmethod
    def click(self, x: int, y: int) -> bool:
        """模擬點擊座標"""
        pass

    @abstractmethod
    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 500) -> bool:
        """模擬滑動"""
        pass

    @abstractmethod
    def type_text(self, text: str) -> bool:
        """模擬文字輸入"""
        pass

    @abstractmethod
    def key_event(self, key_code: Union[int, str]) -> bool:
        """模擬按鍵事件 (如 Back, Home, 或鍵盤按鍵)"""
        pass

    # --- 高階 OpenCV 封裝 (基類直接提供，子類可覆寫) ---

    def find_image(self, image_path: str, region: Optional["OcrRegion"] = None, threshold: float = 0.9) -> Optional[dict]:
        """在螢幕中尋找指定圖片"""
        import sys
        from ..core.opencv.mat_utility import MatUtility
        
        # print(f"[Bridge/find_image] image_path={image_path}, threshold={threshold}", file=sys.stderr)
        
        src = self.snapshot()
        if src is None:
            return None
        
        target = self._get_image_mat(image_path)
        if target is None:
            return None
            
        # 如果有指定區域，則進行裁切
        if region:
            src = MatUtility.slice_region_mat_from_source(src, region)
            
        pattern = self.open_cv_service.find_match(src, target)
        similarity = pattern.get_similar()
        
        if similarity >= threshold:
            # 如果裁切過，座標需要補償
            x, y = pattern.point
            if region:
                x += region.x1
                y += region.y1
            return {
                "x": x,
                "y": y,
                "similarity": similarity
            }
        return None

    def click_image(self, image_path: str, region: Optional["OcrRegion"] = None, threshold: float = 0.9) -> dict:
        """尋找圖片並點擊"""
        res = self.find_image(image_path, region, threshold)
        if res:
            self.click(int(res["x"]), int(res["y"]))
            return {"success": True, "x": res["x"], "y": res["y"], "similarity": res["similarity"]}
        return {"success": False}

    def wait_image(self, image_path: str, timeout: int = 10, frequency: float = 0.5, threshold: float = 0.9, region: Optional["OcrRegion"] = None) -> Optional[dict]:
        """等待圖片出現"""
        start_time = time.time()
        while (time.time() - start_time) < timeout:
            res = self.find_image(image_path, region, threshold)
            if res:
                return res
            time.sleep(frequency)
        return None

    def wait_click_image(self, image_path: str, timeout: int = 10, frequency: float = 0.5, threshold: float = 0.9, region: Optional["OcrRegion"] = None) -> dict:
        """等待圖片出現並點擊"""
        res = self.wait_image(image_path, timeout, frequency, threshold, region)
        if res:
            self.click(int(res["x"]), int(res["y"]))
            return {"success": True, "x": res["x"], "y": res["y"], "similarity": res["similarity"]}
        return {"success": False}

    # --- OCR 操作 封裝 ---

    def ocr_text(self, templates_path: str, region: "OcrRegion", threshold: float = 0.8) -> str:
        """在指定區域進行文字辨識 (OCR)"""
        src = self.snapshot()
        if src is None: return ""
        return self.open_cv_service.ocr_character_from_mat(templates_path, src, region, threshold)

    def ocr_pattern(self, templates_path: str, region: "OcrRegion", threshold: float = 0.8) -> str:
        """在指定區域進行圖案/符號辨識 (OCR)"""
        src = self.snapshot()
        if src is None: return ""
        return self.open_cv_service.ocr_pattern_from_mat(templates_path, src, region, threshold)

    # --- 輔助工具 ---

    def sleep(self, seconds: float) -> None:
        """執行緒休眠"""
        time.sleep(seconds)

    def _get_image_mat(self, image_path: str) -> Optional[np.ndarray]:
        """從檔案路徑加載圖片 Mat"""
        from ..core.opencv.mat_utility import MatUtility
        
        path = Path(image_path)
        if not path.is_absolute():
            # 自動搜尋專案根目錄
            if not self._project_root:
                self._project_root = self._find_project_root()
            
            # Try direct path
            direct_path = self._project_root / image_path
            
            # Try images/ subfolder fallback
            if not direct_path.exists() and not str(image_path).startswith("images"):
                fallback_path = self._project_root / "images" / image_path
                if fallback_path.exists():
                    path = fallback_path
                else:
                    path = direct_path
            else:
                path = direct_path
            
        if not path.exists():
            import sys
            print(f"[Platform] Image path not found: {path}", file=sys.stderr)
            return None
            
        return MatUtility.get_mat_from_file(str(path))

    def _find_project_root(self) -> Path:
        """尋找 core 目錄所在的專案根目錄"""
        current = Path(__file__).resolve().parent
        # 向上尋找直到發現 'core' 資料夾或是根目錄
        for _ in range(10):
            if (current / "core").exists() or (current.name == "core"):
                # 如果就在 core 裡面，返回 core 的父目錄
                if current.name == "core":
                    return current.parent
                return current
            current = current.parent
        return Path(".").resolve()

