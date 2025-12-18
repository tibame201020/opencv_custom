"""
OCR 適配器介面
"""
from abc import ABC, abstractmethod
from pathlib import Path
import cv2
import numpy as np
from typing import Dict
from ..mat_utility import MatUtility


class MatchOCRAdaptor(ABC):
    """OCR 適配器抽象類別"""
    
    @abstractmethod
    def execute_ocr(self, ocr_templates_path: str, target_img: np.ndarray, threshold: float) -> str:
        """
        執行 OCR
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            target_img: 目標影像 Mat
            threshold: 閾值
            
        Returns:
            OCR 辨識結果
        """
        pass
    
    def load_template_mat_map(self, ocr_templates_path: str) -> Dict[str, np.ndarray]:
        """
        載入 OCR 模板到字典
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑（相對於專案根目錄）
            
        Returns:
            模板字典 {檔名: Mat}
        """
        from pathlib import Path
        
        extension = ".png"
        templates = {}
        
        # 如果是相對路徑，從專案根目錄開始
        if not Path(ocr_templates_path).is_absolute():
            # 從當前文件向上找到專案根目錄
            # match_ocr_adaptor.py 在 py-version/service/core/opencv/ocr/
            # 需要向上 5 層到專案根目錄（opencv_custom）
            current_file = Path(__file__).resolve()
            # py-version/service/core/opencv/ocr/match_ocr_adaptor.py
            # -> py-version/service/core/opencv/ocr/ (parent)
            # -> py-version/service/core/opencv/ (parent.parent)
            # -> py-version/service/core/ (parent.parent.parent)
            # -> py-version/service/ (parent.parent.parent.parent)
            # -> py-version/ (parent.parent.parent.parent.parent)
            # -> 專案根目錄 (parent.parent.parent.parent.parent.parent)
            project_root = current_file.parent.parent.parent.parent.parent.parent
            template_path = project_root / ocr_templates_path
        else:
            template_path = Path(ocr_templates_path)
        
        if not template_path.exists():
            print(f"警告: OCR 模板路徑不存在: {template_path}")
            return templates
        
        # 遍歷所有 PNG 檔案
        for png_file in template_path.rglob(f"*{extension}"):
            file_name = png_file.stem  # 不含副檔名的檔名
            file_full_path = str(png_file.absolute())
            try:
                mat = MatUtility.get_mat_from_file_with_mask(file_full_path)
                if mat is not None:
                    templates[file_name] = mat
            except Exception as e:
                print(f"載入模板失敗 {file_name}: {e}")
        
        return templates

