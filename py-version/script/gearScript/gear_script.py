"""
Gear 腳本 - 裝備自動化處理
"""
import numpy as np
from pathlib import Path
from typing import Dict, Optional
from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.mat_utility import MatUtility
from service.core.opencv.dto import OcrRegion
from ..script_interface import ScriptInterface
from .gear_image_dtos import GearOcr, GearRegion
from .gear.gear_dtos import (
    Gear, GearMetadata, GearProp, GearSet, GearRarity, GearType,
    GearMainProp, GearAction
)
from .gear.purple_gear_upgrade_adapter import PurpleGearUpgradeAdapter
from .gear.red_gear_upgrade_adapter import RedGearUpgradeAdapter


class GearScript(ScriptInterface):
    """裝備腳本"""
    
    def __init__(self, adb_platform: AdbPlatform):
        super().__init__()
        self.adb_platform = adb_platform
        self.open_cv_service = adb_platform.get_open_cv_service()
        self.purple_gear_upgrade_adapter = PurpleGearUpgradeAdapter()
        self.red_gear_upgrade_adapter = RedGearUpgradeAdapter()
        self.configure()  # 配置設定
        self.ocr_configs: Dict[str, GearOcr] = {}
        self._init_ocr_configs()
    
    def configure(self) -> None:
        """配置設定"""
        # 覆蓋預設設定，指向 gearScript/images 目錄
        gear_script_dir = Path(__file__).parent.resolve()  # py-version/script/gearScript
        self.image_root = str(gear_script_dir / "images")  # py-version/script/gearScript/images
        self.default_threshold = 0.8
    
    def _init_ocr_configs(self):
        """初始化 OCR 配置"""
        # Main and Sub-properties values
        self.ocr_configs["mainProp"] = GearOcr(
            f"{self.image_root}/number-ocr/main-ocr",
            GearRegion(1160, 330, 70, 30),
            0.8
        )
        self.ocr_configs["1stProp"] = GearOcr(
            f"{self.image_root}/number-ocr/ocr",
            GearRegion(1160, 370, 70, 25),
            0.8
        )
        self.ocr_configs["2ndProp"] = GearOcr(
            f"{self.image_root}/number-ocr/ocr",
            GearRegion(1160, 390, 70, 25),
            0.8
        )
        self.ocr_configs["3rdProp"] = GearOcr(
            f"{self.image_root}/number-ocr/ocr",
            GearRegion(1160, 415, 70, 25),
            0.8
        )
        self.ocr_configs["4thProp"] = GearOcr(
            f"{self.image_root}/number-ocr/ocr",
            GearRegion(1160, 435, 70, 25),
            0.8
        )
        self.ocr_configs["score"] = GearOcr(
            f"{self.image_root}/number-ocr/score-ocr",
            GearRegion(1160, 470, 70, 30),
            0.84
        )
        
        # Gear metadata
        self.ocr_configs["gearSet"] = GearOcr(
            f"{self.image_root}/gear-set-ocr",
            GearRegion(900, 550, 100, 40),
            0.95
        )
        self.ocr_configs["gearRarity"] = GearOcr(
            f"{self.image_root}/gear-rarity-ocr",
            GearRegion(972, 180, 35, 23),
            0.85
        )
        self.ocr_configs["gearType"] = GearOcr(
            f"{self.image_root}/gear-type-ocr",
            GearRegion(1007, 180, 35, 23),
            0.75
        )
        self.ocr_configs["gearLevel"] = GearOcr(
            f"{self.image_root}/gear-level-ocr",
            GearRegion(935, 168, 35, 25),
            0.98
        )
        
        # Main and Sub-properties types
        self.ocr_configs["mainPropType"] = GearOcr(
            f"{self.image_root}/main-prop-type-ocr",
            GearRegion(880, 327, 120, 35),
            0.85
        )
        self.ocr_configs["1stPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 365, 120, 30),
            0.85
        )
        self.ocr_configs["2ndPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 389, 120, 30),
            0.85
        )
        self.ocr_configs["3rdPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 410, 120, 30),
            0.85
        )
        self.ocr_configs["4thPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 435, 120, 30),
            0.85
        )
    
    def execute(self) -> None:
        """執行腳本"""
        device_id = "emulator-5554"  # 或使用 fetch_device_id()
        self.adb_platform.set_device_id(device_id)
        self.adb_platform.connect(device_id)
        
        while True:
            self.gear_loop(device_id)
    
    def fetch_device_id(self) -> str:
        """取得裝置 ID"""
        devices = self.adb_platform.get_devices()
        print(f"Please input device id: {devices}")
        device_id = input().strip()
        
        if device_id not in devices:
            raise ValueError(f"Invalid device id: {device_id}")
        
        return device_id
    
    def gear_loop(self, device_id: str) -> None:
        """裝備處理迴圈"""
        print("-------------------------------")
        try:
            self.adb_platform.sleep(1)
            self.adb_platform.click(195, 199, device_id)
            self.adb_platform.sleep(2)
            
            snapshot_mat = self.adb_platform.take_snapshot(device_id)
            if snapshot_mat is None:
                print("無法取得截圖")
                return
            
            gear = self.detect_gear(snapshot_mat)
            print(f"Gear[metadata={gear.metadata}, prop={gear.prop}]")
            action = self.judgment_gear(gear)
            print(gear.metadata.get_metadata_info())
            print(gear.prop.get_prop_info())
            print(action)
            
            if action == GearAction.EXTRACTION:
                self.extract_gear(device_id)
            elif action == GearAction.UPGRADE:
                self.upgrade_gear(device_id, gear)
            elif action == GearAction.SELL:
                self.sell_gear(device_id)
            elif action == GearAction.STORE:
                self.store_gear(device_id)
        except Exception as e:
            print(f"處理裝備時發生錯誤: {e}")
            import traceback
            traceback.print_exc()
    
    def judgment_gear(self, gear: Gear) -> GearAction:
        """判斷裝備動作"""
        rarity = gear.metadata.rarity
        level = gear.metadata.level
        
        if rarity == GearRarity.HERO:
            result = (self.purple_gear_upgrade_adapter.is_ok_to_store(gear) 
                     if level == 15 
                     else self.purple_gear_upgrade_adapter.is_ok_to_upgrade(gear))
            return GearAction.STORE if (level == 15 and result) else (GearAction.UPGRADE if result else GearAction.SELL)
        elif rarity == GearRarity.LEGEND:
            result = (self.red_gear_upgrade_adapter.is_ok_to_store(gear) 
                     if level == 15 
                     else self.red_gear_upgrade_adapter.is_ok_to_upgrade(gear))
            return GearAction.STORE if (level == 15 and result) else (GearAction.UPGRADE if result else GearAction.SELL)
        else:
            return GearAction.EXTRACTION
    
    def detect_gear(self, source: np.ndarray) -> Gear:
        """偵測裝備"""
        gear_set_ocr = self.ocr_pattern(self.ocr_configs["gearSet"], source)
        gear_rarity_ocr = self.ocr_pattern(self.ocr_configs["gearRarity"], source)
        gear_type_ocr = self.ocr_pattern(self.ocr_configs["gearType"], source)
        gear_level_ocr = self.ocr_pattern(self.ocr_configs["gearLevel"], source)
        score_ocr = self.ocr_character(self.ocr_configs["score"], source)
        
        main_type = self.ocr_pattern(self.ocr_configs["mainPropType"], source)
        main = self.ocr_character(self.ocr_configs["mainProp"], source)
        
        _1st_type = self.ocr_pattern(self.ocr_configs["1stPropType"], source)
        _1st = self.ocr_character(self.ocr_configs["1stProp"], source)
        
        _2nd_type = self.ocr_pattern(self.ocr_configs["2ndPropType"], source)
        _2nd = self.ocr_character(self.ocr_configs["2ndProp"], source)
        
        _3rd_type = self.ocr_pattern(self.ocr_configs["3rdPropType"], source)
        _3rd = self.ocr_character(self.ocr_configs["3rdProp"], source)
        
        _4th_type = self.ocr_pattern(self.ocr_configs["4thPropType"], source)
        _4th = self.ocr_character(self.ocr_configs["4thProp"], source)
        
        metadata = self.convert_gear_metadata(
            gear_set_ocr, gear_rarity_ocr, gear_type_ocr, gear_level_ocr,
            main_type, main, score_ocr
        )
        
        ignore_unknown_types = metadata.rarity != GearRarity.LEGEND
        prop = self.convert_gear_prop(
            main_type, main, _1st_type, _1st, _2nd_type, _2nd,
            _3rd_type, _3rd, _4th_type, _4th, ignore_unknown_types
        )
        
        return Gear(metadata, prop)
    
    def convert_gear_metadata(self, gear_set_ocr: str, gear_rarity_ocr: str,
                              gear_type_ocr: str, gear_level_ocr: str,
                              main_type: str, main: str, score_ocr: str) -> GearMetadata:
        """轉換 OCR 結果為裝備元資料"""
        try:
            gear_set = GearSet[gear_set_ocr] if gear_set_ocr else GearSet.CRITICAL
        except KeyError:
            print(f"無法識別套裝: {gear_set_ocr}, 使用預設值 CRITICAL")
            gear_set = GearSet.CRITICAL
        
        gear_rarity_ocr = gear_rarity_ocr.strip() if gear_rarity_ocr else "OTHER"
        try:
            gear_rarity = GearRarity[gear_rarity_ocr] if gear_rarity_ocr else GearRarity.OTHER
        except KeyError:
            print(f"無法識別稀有度: {gear_rarity_ocr}, 使用預設值 OTHER")
            gear_rarity = GearRarity.OTHER
        
        try:
            gear_type = GearType[gear_type_ocr] if gear_type_ocr else GearType.RING
        except KeyError:
            print(f"無法識別類型: {gear_type_ocr}, 使用預設值 RING")
            gear_type = GearType.RING
        
        gear_level_ocr = gear_level_ocr.strip() if gear_level_ocr else "0"
        try:
            gear_level = int(gear_level_ocr)
        except ValueError:
            print(f"無法解析等級: {gear_level_ocr}, 使用預設值 0")
            gear_level = 0
        
        # 判斷主屬性
        if main_type == "atk":
            gear_main_prop = GearMainProp.ATK_PERCENT if "%" in main else GearMainProp.ATK_FLAT
        elif main_type == "life":
            gear_main_prop = GearMainProp.LIFE_PERCENT if "%" in main else GearMainProp.LIFE_FLAT
        elif main_type == "def":
            gear_main_prop = GearMainProp.DEF_PERCENT if "%" in main else GearMainProp.DEF_FLAT
        elif main_type == "speed":
            gear_main_prop = GearMainProp.SPEED
        elif main_type == "cri-rate":
            gear_main_prop = GearMainProp.CRI_RATE
        elif main_type == "cri-damage":
            gear_main_prop = GearMainProp.CRI_DMG
        elif main_type == "effect-hit":
            gear_main_prop = GearMainProp.EFFECT_HIT
        elif main_type == "effect-resistance":
            gear_main_prop = GearMainProp.EFFECT_RESISTANCE
        else:
            print(f"無法識別主屬性類型: {main_type}, 使用預設值 LIFE_PERCENT")
            gear_main_prop = GearMainProp.LIFE_PERCENT
        
        try:
            score = int(score_ocr) if score_ocr else 0
        except ValueError:
            print(f"無法解析評分: {score_ocr}, 使用預設值 0")
            score = 0
        
        return GearMetadata(
            gear_set, gear_rarity, gear_type, gear_level,
            gear_main_prop, score
        )
    
    def convert_gear_prop(self, main_type: str, main: str,
                          _1st_type: str, _1st: str, _2nd_type: str, _2nd: str,
                          _3rd_type: str, _3rd: str, _4th_type: str, _4th: str,
                          ignore_unknown_types: bool) -> GearProp:
        """轉換 OCR 結果為裝備屬性"""
        props = {
            'attack_percent': 0, 'flat_attack': 0,
            'life_percent': 0, 'flat_life': 0,
            'defense_percent': 0, 'flat_defense': 0,
            'critical_rate': 0, 'critical_damage': 0,
            'speed': 0, 'effect_resist': 0, 'effectiveness': 0
        }
        
        def parse_and_accumulate(prop_type: str, value: str):
            cleaned_value = value.replace("%", "").replace(",", "")
            try:
                parsed_value = int(cleaned_value)
            except ValueError:
                print(f"Error parsing number: {cleaned_value} for type: {prop_type}")
                return
            
            if prop_type == "atk":
                if "%" in value:
                    props['attack_percent'] = parsed_value
                else:
                    props['flat_attack'] = parsed_value
            elif prop_type == "life":
                if "%" in value:
                    props['life_percent'] = parsed_value
                else:
                    props['flat_life'] = parsed_value
            elif prop_type == "def":
                if "%" in value:
                    props['defense_percent'] = parsed_value
                else:
                    props['flat_defense'] = parsed_value
            elif prop_type == "speed":
                # OCR bug: 3 recognize 83
                if parsed_value == 83:
                    parsed_value = 3
                props['speed'] = parsed_value
            elif prop_type == "cri-rate":
                props['critical_rate'] = parsed_value
            elif prop_type == "cri-damage":
                props['critical_damage'] = parsed_value
            elif prop_type == "effect-hit":
                props['effectiveness'] = parsed_value
            elif prop_type == "effect-resistance":
                props['effect_resist'] = parsed_value
            else:
                print(f"Unknown property type: {prop_type}")
                if not ignore_unknown_types:
                    raise ValueError(f"Unsupported property type: {prop_type}")
        
        parse_and_accumulate(main_type, main)
        parse_and_accumulate(_1st_type, _1st)
        parse_and_accumulate(_2nd_type, _2nd)
        parse_and_accumulate(_3rd_type, _3rd)
        parse_and_accumulate(_4th_type, _4th)
        
        return GearProp(**props)
    
    def ocr_pattern(self, gear_ocr: GearOcr, source: np.ndarray) -> str:
        """OCR 圖案"""
        ocr_region = self._convert_to_ocr_region(gear_ocr.gear_region)
        return self.open_cv_service.ocr_pattern_from_mat(
            gear_ocr.ocr_templates_path, source, ocr_region, gear_ocr.threshold
        )
    
    def ocr_character(self, gear_ocr: GearOcr, source: np.ndarray) -> str:
        """OCR 字元"""
        ocr_region = self._convert_to_ocr_region(gear_ocr.gear_region)
        return self.open_cv_service.ocr_character_from_mat(
            gear_ocr.ocr_templates_path, source, ocr_region, gear_ocr.threshold
        )
    
    def _convert_to_ocr_region(self, gear_region: GearRegion) -> OcrRegion:
        """轉換 GearRegion 為 OcrRegion"""
        return OcrRegion(
            gear_region.x,
            gear_region.y,
            gear_region.x + gear_region.width,
            gear_region.y + gear_region.height
        )
    
    def upgrade_gear(self, device_id: str, gear: Gear) -> None:
        """升級裝備"""
        region = OcrRegion(1077, 640, 1225, 707)
        self.adb_platform.click_image(f"{self.image_root}/action/upgrade-1.png", region, device_id)
        self.adb_platform.wait_image(f"{self.image_root}/action/upgrade-2.png", 5000, 100, device_id)
        self.adb_platform.sleep(1)
        
        region = OcrRegion(925, 620, 1230, 700)
        self.adb_platform.click_image(f"{self.image_root}/action/upgrade-3.png", region, device_id)
        
        level = gear.metadata.level
        upgrade_level_options = [3, 6, 9, 12, 15]
        closest_upgrade_level = next((opt for opt in upgrade_level_options if opt > level), 15)
        upgrade_option_image = f"{self.image_root}/action/plus-{closest_upgrade_level}.png"
        
        region = OcrRegion(950, 315, 1190, 625)
        self.adb_platform.sleep(1)
        self.adb_platform.click_image(upgrade_option_image, region, device_id)
        self.adb_platform.sleep(1)
        
        region = OcrRegion(725, 640, 810, 680)
        self.adb_platform.click_image(f"{self.image_root}/action/upgrade-4.png", region, device_id)
        
        self.adb_platform.sleep(3)
        self.adb_platform.click(640, 520, device_id)
        self.adb_platform.click(640, 520, device_id)
        self.adb_platform.click(640, 520, device_id)
        
        self.adb_platform.wait_image(f"{self.image_root}/action/upgrade-2.png", 7000, 100, device_id)
        
        region = OcrRegion(0, 0, 65, 55)
        self.adb_platform.click_image(f"{self.image_root}/action/upgrade-5.png", region, device_id)
    
    def sell_gear(self, device_id: str) -> None:
        """販賣裝備"""
        self.adb_platform.click(918, 617, device_id)
        self.adb_platform.sleep(2)
        self.adb_platform.click(750, 530, device_id)
        self.adb_platform.sleep(3)
    
    def extract_gear(self, device_id: str) -> None:
        """萃取裝備"""
        self.adb_platform.click(985, 620, device_id)
        self.adb_platform.sleep(2)
        self.adb_platform.click(750, 530, device_id)
        self.adb_platform.sleep(3)
    
    def store_gear(self, device_id: str) -> None:
        """儲存裝備"""
        self.adb_platform.click(1045, 620, device_id)
        self.adb_platform.sleep(2)
        self.adb_platform.click(755, 455, device_id)
        self.adb_platform.sleep(3)

