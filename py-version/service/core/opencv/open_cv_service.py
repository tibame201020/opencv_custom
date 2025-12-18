"""
OpenCV 服務 - 提供影像匹配與 OCR 功能
"""
import cv2
import numpy as np
from typing import Union
from .mat_utility import MatUtility
from .dto import MatchPattern, OcrRegion
from .ocr.character_ocr import CharacterOCR
from .ocr.pattern_ocr import PatternOCR


class OpenCvService:
    """OpenCV 服務類別"""
    
    def __init__(self):
        self.character_ocr = CharacterOCR()
        self.pattern_ocr = PatternOCR()
    
    def find_match(self, source: np.ndarray, target: np.ndarray) -> MatchPattern:
        """
        在來源影像中尋找目標影像
        
        Args:
            source: 來源影像 Mat
            target: 目標影像 Mat
            
        Returns:
            MatchPattern 物件
        """
        match_method = cv2.TM_SQDIFF_NORMED
        
        result = cv2.matchTemplate(source, target, match_method)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        # 計算中心點
        point = (min_loc[0] + target.shape[1] / 2.0, 
                 min_loc[1] + target.shape[0] / 2.0)
        
        return MatchPattern(min_val, point)
    
    def ocr_character(self, 
                     ocr_templates_path: str, 
                     source_path: str, 
                     ocr_region: OcrRegion, 
                     threshold: float) -> str:
        """
        從來源影像路徑進行 OCR 字元辨識
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            source_path: 來源影像路徑
            ocr_region: OCR 區域
            threshold: 閾值
            
        Returns:
            OCR 辨識結果
        """
        target_img = MatUtility.slice_region_mat(source_path, ocr_region)
        character_ocr = CharacterOCR()
        return character_ocr.execute_ocr(ocr_templates_path, target_img, threshold)
    
    def ocr_character_from_mat(self, 
                               ocr_templates_path: str, 
                               source: np.ndarray, 
                               ocr_region: OcrRegion, 
                               threshold: float) -> str:
        """
        從來源 Mat 進行 OCR 字元辨識
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            source: 來源影像 Mat
            ocr_region: OCR 區域
            threshold: 閾值
            
        Returns:
            OCR 辨識結果
        """
        target_img = MatUtility.slice_region_mat_from_source(source, ocr_region)
        return self.character_ocr.execute_ocr(ocr_templates_path, target_img, threshold)
    
    def ocr_pattern(self, 
                   ocr_templates_path: str, 
                   source_path: str, 
                   ocr_region: OcrRegion, 
                   threshold: float) -> str:
        """
        從來源影像路徑進行 OCR 圖案辨識
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            source_path: 來源影像路徑
            ocr_region: OCR 區域
            threshold: 閾值
            
        Returns:
            OCR 辨識結果
        """
        target_img = MatUtility.slice_region_mat(source_path, ocr_region)
        return self.pattern_ocr.execute_ocr(ocr_templates_path, target_img, threshold)
    
    def ocr_pattern_from_mat(self, 
                            ocr_templates_path: str, 
                            source: np.ndarray, 
                            ocr_region: OcrRegion, 
                            threshold: float) -> str:
        """
        從來源 Mat 進行 OCR 圖案辨識
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            source: 來源影像 Mat
            ocr_region: OCR 區域
            threshold: 閾值
            
        Returns:
            OCR 辨識結果
        """
        target_img = MatUtility.slice_region_mat_from_source(source, ocr_region)
        return self.pattern_ocr.execute_ocr(ocr_templates_path, target_img, threshold)

