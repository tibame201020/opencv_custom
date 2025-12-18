"""
OpenCV DTOs (Data Transfer Objects)
"""
from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class MatchPattern:
    """影像匹配結果"""
    similar: float  # 相似度 (0-1)
    point: Tuple[float, float]  # 匹配點座標 (x, y)
    
    def get_similar(self) -> float:
        """取得相似度 (轉換為 1.0 - similar)"""
        return 1.0 - self.similar


@dataclass
class OcrRegion:
    """OCR 區域定義"""
    x1: int  # 左上角 x
    y1: int  # 左上角 y
    x2: int  # 右下角 x
    y2: int  # 右下角 y

