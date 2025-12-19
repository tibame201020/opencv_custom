"""
Evil Hunter 腳本
"""
from datetime import datetime
from typing import Optional, Tuple
import numpy as np
from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.dto import OcrRegion
from .evil_hunter_config import *


class EvilHunterScript:
    """Evil Hunter 腳本"""
    
    def __init__(self, adb_platform: AdbPlatform):
        self.adb_platform = adb_platform
        self.open_cv_service = adb_platform.get_open_cv_service()
        self.enable_character_match = False
    
    def execute(self) -> None:
        """執行腳本"""
        device_id = self.fetch_device_id()
        self.adb_platform.connect(device_id)
        
        while True:
            self.loop_script(device_id)
            self.adb_platform.sleep(LOOP_INTERVAL_SECONDS)
    
    def fetch_device_id(self) -> str:
        """取得裝置 ID"""
        devices = self.adb_platform.get_devices()
        print(f"Please input device id: {devices}")
        device_id = input().strip()
        
        if device_id not in devices:
            raise ValueError(f"Invalid device id: {device_id}")
        
        print("Please input enable character match: Y/N")
        enable_character_match = input().strip().upper()
        valid_options = ["Y", "N"]
        if enable_character_match not in valid_options:
            raise ValueError(f"Invalid enable character match: {enable_character_match}")
        
        self.enable_character_match = enable_character_match == "Y"
        
        return device_id
    
    def loop_script(self, device_id: str) -> None:
        """迴圈腳本"""
        self.to_hunter_box(device_id)
        self.adb_platform.sleep(1)
        self.check_hunter(device_id)
        self.adb_platform.sleep(1)
        self.check_boss(device_id)
        self.adb_platform.sleep(1)
        self.check_dungeon(device_id)
    
    def to_hunter_box(self, device_id: str) -> None:
        """前往獵人盒子"""
        self.adb_platform.click(TO_SOUL_SHOP_CLICK_X, TO_SOUL_SHOP_CLICK_Y, device_id)
        self.adb_platform.sleep(1)
        
        self.adb_platform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, device_id)
        self.adb_platform.sleep(1)
        
        self.adb_platform.swipe_with_duration(THIRD_X, 1088, THIRD_X, 500, 300, device_id)
        self.adb_platform.swipe_with_duration(THIRD_X, 1088, THIRD_X, 500, 300, device_id)
    
    def check_hunter(self, device_id: str) -> None:
        """檢查獵人"""
        self.adb_platform.click(THIRD_X, Y_COORDINATE, device_id)
        self.adb_platform.sleep(2)
        
        point = self.adb_platform.find_image_full(PER_SECOND_DAMAGE_IMAGE_PATH, device_id)
        if point is None:
            self.adb_platform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, device_id)
            return
        
        snapshot_mat = self.adb_platform.take_snapshot(device_id)
        if snapshot_mat is None:
            return
        
        character_region = OcrRegion(CHARACTER_REGION_X1, CHARACTER_REGION_Y1, 
                                     CHARACTER_REGION_X2, CHARACTER_REGION_Y2)
        character = self.open_cv_service.ocr_pattern_from_mat(
            CHARACTER_OCR_PATH, snapshot_mat, character_region, CHARACTER_THRESHOLD
        )
        
        rarity_region = OcrRegion(RARITY_REGION_X1, RARITY_REGION_Y1,
                                 RARITY_REGION_X2, RARITY_REGION_Y2)
        rarity = self.open_cv_service.ocr_pattern_from_mat(
            RARITY_OCR_PATH, snapshot_mat, rarity_region, RARITY_THRESHOLD
        )
        
        character_match = character in TARGET_CHARACTERS
        rarity_match = rarity in TARGET_RARITIES
        
        character_match = not self.enable_character_match or character_match
        
        if character_match and rarity_match:
            print(f"[match] Hunter: [ character:{character}, rarity:{rarity}] {datetime.now()}")
            self.adb_platform.click(360, 1100, device_id)
            self.adb_platform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, device_id)
            return
        
        print(f"[not match] Hunter: [ character:{character}, rarity:{rarity}] {datetime.now()}")
        
        self.adb_platform.click(360, 1100, device_id)
        self.expel_hunter(device_id)
    
    def expel_hunter(self, device_id: str) -> None:
        """驅逐獵人"""
        self.adb_platform.click(THIRD_LOCK_X, LOCK_Y, device_id)
        self.adb_platform.sleep(1)
        
        self.adb_platform.click(EXPEL_HUNTER_CLICK_X1, EXPEL_HUNTER_CLICK_Y1, device_id)
        self.adb_platform.sleep(1)
        
        self.adb_platform.click(EXPEL_HUNTER_CLICK_X2, EXPEL_HUNTER_CLICK_Y2, device_id)
        self.adb_platform.click(EXPEL_HUNTER_CLICK_X3, EXPEL_HUNTER_CLICK_Y3, device_id)
        self.adb_platform.click(EXPEL_HUNTER_CLICK_X4, EXPEL_HUNTER_CLICK_Y4, device_id)
    
    def check_boss(self, device_id: str) -> None:
        """檢查 Boss"""
        self.adb_platform.click(TO_SOUL_SHOP_CLICK_X, TO_SOUL_SHOP_CLICK_Y, device_id)
        self.adb_platform.sleep(1)
        self.adb_platform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, device_id)
        self.adb_platform.sleep(1)
        self.adb_platform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, device_id)
        self.adb_platform.sleep(1)
        self.adb_platform.click(669, 1083, device_id)
        self.adb_platform.sleep(1)
        
        self.adb_platform.click(671, 166, device_id)
        self.adb_platform.sleep(5)
        
        region = OcrRegion(100, 410, 600, 865)
        end_boss_point = self.adb_platform.find_image("images/evil-hunter/boss/boss_2.png", region, device_id)
        if end_boss_point is not None:
            self.adb_platform.click(455, 757, device_id)
            self.adb_platform.sleep(1)
            return
        
        start_boss_point = self.adb_platform.find_image("images/evil-hunter/boss/boss_1.png", region, device_id)
        if start_boss_point is None:
            return
        
        self.adb_platform.click(260, 760, device_id)
        self.adb_platform.sleep(3)
        self.adb_platform.click(669, 1083, device_id)
        self.adb_platform.sleep(1)
    
    def check_dungeon(self, device_id: str) -> None:
        """檢查地牢"""
        # 目前未實作
        pass


