"""
Mat 工具類別 - 提供 OpenCV Mat 相關工具函數
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Optional


class MatUtility:
    """OpenCV Mat 工具類別"""
    
    @staticmethod
    def get_mat_from_file(file_path: str) -> np.ndarray:
        """
        從檔案路徑載入 Mat 物件（灰階）
        
        Args:
            file_path: 檔案路徑
            
        Returns:
            Mat 物件（灰階）
        """
        return cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    
    @staticmethod
    def get_mat_from_file_with_mask(file_path: str) -> np.ndarray:
        """
        從檔案路徑載入 Mat 物件（支援 Alpha 通道遮罩）
        
        Args:
            file_path: 檔案路徑
            
        Returns:
            處理後的 Mat 物件
        """
        img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise RuntimeError(f"Error: Could not load image {file_path}")
        
        # 如果有 Alpha 通道（4 通道 RGBA）
        if len(img.shape) == 3 and img.shape[2] == 4:
            # 提取 Alpha 通道作為遮罩
            alpha = img[:, :, 3]
            # 轉換為 BGR
            bgr = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGRA2BGR)
            # 轉換為灰階
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            # 創建白色背景
            processed_mat = np.full(gray.shape, 255, dtype=np.uint8)
            # 將前景複製到白色背景上（使用 Alpha 遮罩）
            processed_mat[alpha > 0] = gray[alpha > 0]
            return processed_mat
        else:
            # 直接載入為灰階
            return cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    
    @staticmethod
    def convert_bytes_to_mat(bytes_data: bytes) -> Optional[np.ndarray]:
        """
        將位元組陣列轉換為 Mat 物件
        
        Args:
            bytes_data: 位元組陣列
            
        Returns:
            Mat 物件，失敗時返回 None
        """
        if bytes_data is None:
            return None
        nparr = np.frombuffer(bytes_data, np.uint8)
        decoded = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        return decoded
    
    @staticmethod
    def slice_region_mat(source_path: str, region) -> np.ndarray:
        """
        從來源影像中切片指定區域
        
        Args:
            source_path: 來源影像路徑
            region: OcrRegion 物件
            
        Returns:
            切片後的 Mat
        """
        source = MatUtility.get_mat_from_file_with_mask(source_path)
        x1, y1 = region.x1, region.y1
        x2, y2 = region.x2, region.y2
        width = abs(x2 - x1)
        height = abs(y2 - y1)
        
        return source[y1:y1+height, x1:x1+width]
    
    @staticmethod
    def slice_region_mat_from_source(source: np.ndarray, region) -> np.ndarray:
        """
        從來源 Mat 中切片指定區域
        
        Args:
            source: 來源 Mat
            region: OcrRegion 物件
            
        Returns:
            切片後的 Mat
        """
        x1, y1 = region.x1, region.y1
        x2, y2 = region.x2, region.y2
        width = abs(x2 - x1)
        height = abs(y2 - y1)
        
        return source[y1:y1+height, x1:x1+width]
    
    @staticmethod
    def save_slice_region_mat(source_path: str, region, file_name: str) -> None:
        """
        從來源影像中切片指定區域並儲存
        
        Args:
            source_path: 來源影像路徑
            region: OcrRegion 物件
            file_name: 儲存檔名
        """
        sliced = MatUtility.slice_region_mat(source_path, region)
        MatUtility.write_to_file(file_name, sliced)
    
    @staticmethod
    def write_to_file(file_path: str, mat: np.ndarray) -> Path:
        """
        將 Mat 寫入檔案
        
        Args:
            file_path: 檔案路徑
            mat: Mat 物件
            
        Returns:
            儲存的檔案路徑
            
        Raises:
            RuntimeError: 寫入失敗時拋出
        """
        success = cv2.imwrite(file_path, mat)
        if not success:
            raise RuntimeError("error when writeToFile")
        return Path(file_path)

