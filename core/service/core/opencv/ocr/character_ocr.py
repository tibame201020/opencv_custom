"""
字元 OCR - 用於辨識字元
"""
import cv2
import numpy as np
from typing import List, Tuple
from .match_ocr_adaptor import MatchOCRAdaptor


class CharacterOCR(MatchOCRAdaptor):
    """字元 OCR 類別"""
    
    def execute_ocr(self, ocr_templates_path: str, target_img: np.ndarray, threshold: float) -> str:
        """
        執行字元 OCR
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            target_img: 目標影像
            threshold: 閾值
            
        Returns:
            辨識出的字串
        """
        templates = self.load_template_mat_map(ocr_templates_path)
        
        if not templates:
            return ""
        
        results: List[Tuple[str, float]] = []  # (character, x)
        
        for character, template in templates.items():
            # 確保模板尺寸不超過目標影像
            if template.shape[0] > target_img.shape[0] or template.shape[1] > target_img.shape[1]:
                continue
            
            res = cv2.matchTemplate(target_img, template, cv2.TM_CCOEFF_NORMED)
            
            # 將 >= threshold 的位置設為 255，其餘設為 0
            _, mask = cv2.threshold(res, threshold, 255, cv2.THRESH_BINARY)
            mask = mask.astype(np.uint8)
            
            # 找出所有匹配區塊
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                results.append((character, float(x)))
        
        # 根據 x 座標排序
        results.sort(key=lambda r: r[1])
        
        # 組合字串
        return ''.join([r[0] for r in results])

