"""
圖案 OCR - 用於辨識圖案
"""
import cv2
import numpy as np
from .match_ocr_adaptor import MatchOCRAdaptor


class PatternOCR(MatchOCRAdaptor):
    """圖案 OCR 類別"""
    
    def execute_ocr(self, ocr_templates_path: str, target_img: np.ndarray, threshold: float) -> str:
        """
        執行圖案 OCR
        
        Args:
            ocr_templates_path: OCR 模板基礎路徑
            target_img: 目標影像
            threshold: 閾值
            
        Returns:
            辨識出的圖案名稱
        """
        templates = self.load_template_mat_map(ocr_templates_path)
        
        if not templates:
            return ""
        
        result = ""
        
        # 遍歷所有模板進行匹配
        for pattern, template in templates.items():
            # 確保模板尺寸不超過目標影像
            if template.shape[0] > target_img.shape[0] or template.shape[1] > target_img.shape[1]:
                continue
            
            w = template.shape[1]
            h = template.shape[0]
            
            res = cv2.matchTemplate(target_img, template, cv2.TM_CCOEFF_NORMED)
            
            # 尋找所有匹配度高於閾值的位置
            while True:
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
                if max_val >= threshold:
                    match_loc = max_loc
                    result = pattern
                    # 將已匹配的區域設為 0，避免重複檢測
                    cv2.rectangle(res, match_loc, (match_loc[0] + w, match_loc[1] + h), 0, -1)
                else:
                    break
        
        return result

