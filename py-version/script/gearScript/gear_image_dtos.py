"""
Gear 影像 DTOs
"""
from dataclasses import dataclass


@dataclass
class GearRegion:
    """裝備區域"""
    x: int
    y: int
    width: int
    height: int


@dataclass
class GearOcr:
    """裝備 OCR 配置"""
    ocr_templates_path: str
    gear_region: GearRegion
    threshold: float









