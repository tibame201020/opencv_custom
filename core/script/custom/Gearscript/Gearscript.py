"""
Gear Script 2 - Consolidated from gearScript
"""
import numpy as np
from pathlib import Path
from typing import Dict, Optional, List
from dataclasses import dataclass
from enum import Enum
from abc import ABC, abstractmethod
import traceback

from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.mat_utility import MatUtility
from service.core.opencv.dto import OcrRegion
from ...script_interface import ScriptInterface

# ==========================================
# Gear DTOs (from gear/gear_dtos.py)
# ==========================================

class GearMainProp(Enum):
    """裝備主屬性枚舉"""
    ATK_PERCENT = "攻擊百分比"
    LIFE_PERCENT = "生命百分比"
    DEF_PERCENT = "防禦百分比"
    CRI_RATE = "暴擊"
    CRI_DMG = "暴擊傷害"
    SPEED = "速度"
    EFFECT_RESISTANCE = "效果抵抗"
    EFFECT_HIT = "效果命中"
    ATK_FLAT = "攻擊白值"
    LIFE_FLAT = "生命白值"
    DEF_FLAT = "防禦白值"


class GearSet(Enum):
    """套裝效果枚舉"""
    ATTACK = "攻擊套裝 [4]"
    DESTRUCTION = "破滅套裝 [4]"
    DEFENSE = "防禦套裝 [2]"
    HEALTH = "生命套裝 [2]"
    HIT = "命中套裝 [2]"
    RESISTANCE = "抵抗套裝 [2]"
    CRITICAL = "暴擊套裝 [2]"
    SPEED = "速度套裝 [4]"
    REVENGE = "復仇套裝 [4]"
    LIFE_STEAL = "吸血套裝 [4]"
    COUNTER = "反擊套裝 [4]"
    DUAL_ATTACK = "夾攻套裝 [2]"
    IMMUNITY = "免疫套裝 [2]"
    RAGE = "憤怒套裝 [4]"
    PENETRATION = "貫穿套裝 [2]"
    INJURY = "傷口套裝 [4]"
    PROTECTION = "守護套裝 [4]"
    TORRENT = "激流套裝 [2]"


class GearSetType(Enum):
    """套裝類型枚舉"""
    FOUR = "FOUR"
    TWO = "TWO"


class GearType(Enum):
    """裝備類型枚舉"""
    WEAPON = "武器"
    HELMET = "頭盔"
    ARMOR = "盔甲"
    NECKLACE = "項鍊"
    RING = "戒指"
    SHOES = "鞋子"


class GearRarity(Enum):
    """裝備稀有度枚舉"""
    LEGEND = "紅裝"
    HERO = "紫裝"
    OTHER = "其他"


class GearAction(Enum):
    """裝備動作枚舉"""
    UPGRADE = "UPGRADE"
    SELL = "SELL"
    EXTRACTION = "EXTRACTION"
    STORE = "STORE"


@dataclass
class GearProp:
    """裝備屬性"""
    attack_percent: int = 0
    flat_attack: int = 0
    life_percent: int = 0
    flat_life: int = 0
    defense_percent: int = 0
    flat_defense: int = 0
    critical_rate: int = 0
    critical_damage: int = 0
    speed: int = 0
    effect_resist: int = 0
    effectiveness: int = 0
    
    def get_prop_info(self) -> str:
        """取得屬性資訊字串"""
        parts = []
        if self.attack_percent > 0:
            parts.append(f"攻擊: {self.attack_percent}%")
        if self.flat_attack > 0:
            parts.append(f"攻擊白值: {self.flat_attack}")
        if self.life_percent > 0:
            parts.append(f"生命: {self.life_percent}%")
        if self.flat_life > 0:
            parts.append(f"生命白值: {self.flat_life}")
        if self.defense_percent > 0:
            parts.append(f"防禦: {self.defense_percent}%")
        if self.flat_defense > 0:
            parts.append(f"防禦白值: {self.flat_defense}")
        if self.critical_rate > 0:
            parts.append(f"暴擊: {self.critical_rate}%")
        if self.critical_damage > 0:
            parts.append(f"暴擊傷害: {self.critical_damage}%")
        if self.speed > 0:
            parts.append(f"速度: {self.speed}")
        if self.effect_resist > 0:
            parts.append(f"效果抵抗: {self.effect_resist}%")
        if self.effectiveness > 0:
            parts.append(f"效果命中: {self.effectiveness}%")
        
        return f"prop[{', '.join(parts)}]"
    
    def calc_score(self) -> float:
        """計算評分"""
        return (self.attack_percent + self.defense_percent + self.life_percent + 
                self.effectiveness + self.effect_resist + 
                self.speed * 2 + 
                self.critical_rate * 1.5 + 
                self.critical_damage * 1.125)
    
    def reduce_main_prop(self, main_prop: GearMainProp) -> "GearProp":
        """移除主屬性後的新屬性"""
        if main_prop == GearMainProp.ATK_PERCENT:
            return GearProp(0, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate,
                          self.critical_damage, self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.LIFE_PERCENT:
            return GearProp(self.attack_percent, self.flat_attack, 0, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate,
                          self.critical_damage, self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.DEF_PERCENT:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          0, self.flat_defense, self.critical_rate, self.critical_damage,
                          self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.CRI_RATE:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, 0, self.critical_damage,
                          self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.CRI_DMG:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate, 0,
                          self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.SPEED:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate, self.critical_damage,
                          0, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.EFFECT_RESISTANCE:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate, self.critical_damage,
                          self.speed, 0, self.effectiveness)
        elif main_prop == GearMainProp.EFFECT_HIT:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate, self.critical_damage,
                          self.speed, self.effect_resist, 0)
        elif main_prop == GearMainProp.ATK_FLAT:
            return GearProp(self.attack_percent, 0, self.life_percent, self.flat_life,
                          self.defense_percent, self.flat_defense, self.critical_rate, self.critical_damage,
                          self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.LIFE_FLAT:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, 0,
                          self.defense_percent, self.flat_defense, self.critical_rate, self.critical_damage,
                          self.speed, self.effect_resist, self.effectiveness)
        elif main_prop == GearMainProp.DEF_FLAT:
            return GearProp(self.attack_percent, self.flat_attack, self.life_percent, self.flat_life,
                          self.defense_percent, 0, self.critical_rate, self.critical_damage,
                          self.speed, self.effect_resist, self.effectiveness)
        else:
            raise RuntimeError(f"not valid main prop: {main_prop}")


@dataclass
class GearMetadata:
    """裝備元資料"""
    set: GearSet
    rarity: GearRarity
    type: GearType
    level: int
    main_prop: GearMainProp
    score: int
    
    def get_metadata_info(self) -> str:
        """取得元資料資訊字串"""
        return (f"metadata[稀有度: {self.rarity.value}, 強化等級: {self.level}, "
                f"評分: {self.score}, 套裝: {self.set.value}, 部位: {self.type.value}, "
                f"主要屬性: {self.main_prop.value}]")


@dataclass
class Gear:
    """裝備"""
    metadata: GearMetadata
    prop: GearProp
    
    def highest_score(self) -> float:
        """計算最高評分"""
        weighted_score = {
            6: self.prop.calc_score() + 24,
            9: self.prop.calc_score() + 16,
            12: self.prop.calc_score() + 8,
            15: self.prop.calc_score() + 0
        }.get(self.metadata.level, 0)
        
        if weighted_score == 0:
            raise RuntimeError(f"not valid level: {self.metadata.level}")
        
        return weighted_score * 1.2 + 27


def flat_prop_count(gear_prop: GearProp) -> int:
    """計算白值屬性數量"""
    count = 0
    if gear_prop.flat_attack > 0:
        count += 1
    if gear_prop.flat_life > 0:
        count += 1
    if gear_prop.flat_defense > 0:
        count += 1
    return count


class GearPropBelong(Enum):
    """裝備屬性歸屬"""
    DAMAGE = "打手"
    TANK_DAMAGE = "坦打"
    TANK = "坦克"
    SUPPORT = "輔助"
    
    def is_gear_prop_belong(self, gear_prop: GearProp) -> bool:
        """判斷裝備屬性是否屬於此歸屬"""
        flat_count = flat_prop_count(gear_prop)
        
        if flat_count >= 2:
            return False
        
        valid_props = 0
        
        if self == GearPropBelong.DAMAGE:
            if gear_prop.attack_percent > 0:
                valid_props += 1
            if gear_prop.critical_rate > 0:
                valid_props += 1
            if gear_prop.critical_damage > 0:
                valid_props += 1
            if gear_prop.speed > 0:
                valid_props += 1
            if gear_prop.flat_attack > 0:
                valid_props += 1
            if gear_prop.life_percent > 0:
                valid_props += 1
            if gear_prop.defense_percent > 0:
                valid_props += 1
            if gear_prop.effect_resist > 0:
                valid_props += 1
            return valid_props >= 4
        
        elif self == GearPropBelong.TANK_DAMAGE:
            if gear_prop.attack_percent > 0:
                valid_props += 1
            if gear_prop.critical_rate > 0:
                valid_props += 1
            if gear_prop.critical_damage > 0:
                valid_props += 1
            if gear_prop.speed > 0:
                valid_props += 1
            if gear_prop.life_percent > 0:
                valid_props += 1
            if gear_prop.flat_life > 0:
                valid_props += 1
            if gear_prop.defense_percent > 0:
                valid_props += 1
            if gear_prop.flat_defense > 0:
                valid_props += 1
            if gear_prop.effectiveness > 0:
                valid_props += 1
            if gear_prop.effect_resist > 0:
                valid_props += 1
            return valid_props >= 4
        
        elif self == GearPropBelong.TANK:
            if gear_prop.speed > 0:
                valid_props += 1
            if gear_prop.life_percent > 0:
                valid_props += 1
            if gear_prop.flat_life > 0:
                valid_props += 1
            if gear_prop.defense_percent > 0:
                valid_props += 1
            if gear_prop.flat_defense > 0:
                valid_props += 1
            if gear_prop.effectiveness > 0:
                valid_props += 1
            if gear_prop.effect_resist > 0:
                valid_props += 1
            return valid_props >= 4
        
        elif self == GearPropBelong.SUPPORT:
            if gear_prop.speed > 0:
                valid_props += 1
            if gear_prop.life_percent > 0:
                valid_props += 1
            if gear_prop.flat_life > 0:
                valid_props += 1
            if gear_prop.defense_percent > 0:
                valid_props += 1
            if gear_prop.flat_defense > 0:
                valid_props += 1
            if gear_prop.effectiveness > 0:
                valid_props += 1
            if gear_prop.effect_resist > 0:
                valid_props += 1
            return valid_props >= 4
        
        return False

# ==========================================
# Gear Image DTOs (from gear_image_dtos.py)
# ==========================================

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

# ==========================================
# Gear Upgrade Adapter (from gear/gear_upgrade_adapter.py)
# ==========================================

class GearUpgradeAdapter(ABC):
    """裝備升級適配器抽象類別"""
    
    GEAR_SET_FOUR_TYPES = [
        GearSet.ATTACK, GearSet.DESTRUCTION, GearSet.SPEED, GearSet.RAGE,
        GearSet.REVENGE, GearSet.COUNTER, GearSet.INJURY, GearSet.LIFE_STEAL,
        GearSet.PROTECTION
    ]
    
    GEAR_SET_TWO_TYPES = [
        GearSet.DEFENSE, GearSet.HEALTH, GearSet.HIT, GearSet.RESISTANCE,
        GearSet.CRITICAL, GearSet.DUAL_ATTACK, GearSet.IMMUNITY,
        GearSet.PENETRATION, GearSet.TORRENT
    ]
    
    @abstractmethod
    def is_ok_to_upgrade(self, gear: Gear) -> bool:
        """判斷是否可以升級"""
        pass
    
    @abstractmethod
    def is_ok_to_store(self, gear: Gear) -> bool:
        """判斷是否可以儲存"""
        pass
    
    def gear_set_type(self, gear_set: GearSet) -> GearSetType:
        """取得套裝類型"""
        if gear_set in self.GEAR_SET_FOUR_TYPES:
            return GearSetType.FOUR
        if gear_set in self.GEAR_SET_TWO_TYPES:
            return GearSetType.TWO
        raise RuntimeError("un caught gear set type")

# ==========================================
# Purple Gear Upgrade Adapter (from gear/purple_gear_upgrade_adapter.py)
# ==========================================

class PurpleGearUpgradeAdapter(GearUpgradeAdapter):
    """紫裝升級適配器"""
    
    def is_ok_to_upgrade(self, gear: Gear) -> bool:
        """判斷紫裝是否可以升級"""
        gear_set = gear.metadata.set
        gear_type = gear.metadata.type
        gear_prop = gear.prop
        
        if gear_type == GearType.SHOES:
            print(f"[紫裝] 不需要部位: {gear_type.value}")
            return False
        
        gear_set_type = self.gear_set_type(gear_set)
        if gear_set != GearSet.SPEED and gear_set_type == GearSetType.FOUR:
            print(f"[紫裝] 不需要套裝: {gear_set.value}")
            return False
        
        score = gear.metadata.score
        if score < 20:
            print(f"[紫裝] 評分: {score}, 需求評分: 20")
            return False
        
        gear_level = gear.metadata.level
        speed = gear_prop.speed
        
        if 0 <= gear_level < 3:
            print(f"[紫裝] 速度: {speed}, 強化等級: {gear_level}, 需求速度: 2")
            return speed >= 2
        elif 3 <= gear_level < 6:
            print(f"[紫裝] 速度: {speed}, 強化等級: {gear_level}, 需求速度: 5")
            return speed >= 5
        elif 6 <= gear_level < 9:
            print(f"[紫裝] 速度: {speed}, 強化等級: {gear_level}, 需求速度: 8")
            return speed >= 8
        elif 9 <= gear_level < 12:
            print(f"[紫裝] 速度: {speed}, 強化等級: {gear_level}, 需求速度: 12")
            return speed >= 12
        elif 12 <= gear_level < 15:
            print(f"[紫裝] 速度: {speed}, 強化等級: {gear_level}, 需求速度: 12")
            return speed >= 12
        
        return speed >= 18
    
    def is_ok_to_store(self, gear: Gear) -> bool:
        """判斷紫裝是否可以儲存"""
        return self.is_ok_to_upgrade(gear)

# ==========================================
# Red Gear Upgrade Adapter (from gear/red_gear_upgrade_adapter.py)
# ==========================================

class RedGearUpgradeAdapter(GearUpgradeAdapter):
    """紅裝升級適配器"""
    
    def is_ok_to_upgrade(self, gear: Gear) -> bool:
        """判斷紅裝是否可以升級"""
        gear_set = gear.metadata.set
        gear_type = gear.metadata.type
        gear_prop = gear.prop
        gear_main_prop = gear.metadata.main_prop
        gear_level = gear.metadata.level
        
        speed = gear.prop.speed
        
        if gear_type != GearType.SHOES:
            if (0 <= gear_level < 9) and speed >= 5:
                print(f"--- 速度足夠: {speed}, 強化等級: {gear_level}, 需求: 5")
                return True
            
            if (9 <= gear_level < 12) and speed >= 10:
                print(f"--- 速度足夠: {speed}, 強化等級: {gear_level}, 需求: 10")
                return True
            
            if gear_level >= 12 and speed >= 15:
                print(f"--- 速度足夠: {speed}, 強化等級: {gear_level}, 需求: 15")
                return True
        
        main_prop_required = self.main_prop_required(gear_set, gear_type, gear_main_prop)
        if not main_prop_required:
            print(f"--- 裝備主屬性不符合: {gear_main_prop.value}, 部位: {gear_type.value}, 套裝: {gear_set.value}")
            return False
        
        gear_prop_needed = self.gear_prop_needed(gear_set, gear_prop, gear_main_prop)
        if not gear_prop_needed:
            print("--- 裝備屬性不符合需求")
            return False
        
        score = gear.metadata.score
        calc_score = gear_prop.reduce_main_prop(gear_main_prop).calc_score()
        
        print(f"score: {score}, calcScore: {calc_score}")
        
        if 0 <= gear_level < 3:
            print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 20")
            return score >= 20
        elif 3 <= gear_level < 6:
            print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 30")
            return score >= 30
        elif 6 <= gear_level < 9:
            print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 40")
            return score >= 40
        elif 9 <= gear_level < 12:
            print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 55")
            return score >= 55
        elif gear_level >= 12:
            print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 65")
            return score >= 65
        
        print(f"--- 裝備評分: {score}, 強化等級: {gear_level}, 評分需求: 80 || calcScore: 70")
        return score >= 80 or calc_score >= 70
    
    def is_ok_to_store(self, gear: Gear) -> bool:
        """判斷紅裝是否可以儲存"""
        return self.is_ok_to_upgrade(gear)
    
    def main_prop_required(self, gear_set: GearSet, gear_type: GearType, main_prop: GearMainProp) -> bool:
        """判斷主屬性是否符合需求"""
        if gear_type in [GearType.WEAPON, GearType.HELMET, GearType.ARMOR]:
            return True
        
        if gear_type == GearType.SHOES and gear_set == GearSet.SPEED:
            return main_prop == GearMainProp.SPEED
        
        if gear_type in [GearType.NECKLACE, GearType.RING, GearType.SHOES]:
            return main_prop not in [GearMainProp.ATK_FLAT, GearMainProp.LIFE_FLAT, GearMainProp.DEF_FLAT]
        
        return False
    
    def gear_prop_needed(self, gear_set: GearSet, gear_prop: GearProp, main_prop: GearMainProp) -> bool:
        """判斷裝備屬性是否符合需求"""
        belongs = self.detect_gear_belong(gear_prop, main_prop)
        belong_texts = [b.value for b in belongs]
        print(f"裝備適性: {belong_texts}")
        
        if not belongs:
            return False
        
        if gear_set in [GearSet.ATTACK, GearSet.RAGE, GearSet.TORRENT, GearSet.LIFE_STEAL, GearSet.DUAL_ATTACK]:
            print(f"{gear_set.value} -> 打手套裝")
            return GearPropBelong.DAMAGE in belongs
        
        if gear_set in [GearSet.HEALTH, GearSet.DEFENSE]:
            print(f"{gear_set.value} -> 坦打/坦克/輔助套裝")
            return (GearPropBelong.SUPPORT in belongs or 
                   GearPropBelong.TANK in belongs or 
                   GearPropBelong.TANK_DAMAGE in belongs)
        
        if gear_set in [GearSet.DESTRUCTION, GearSet.CRITICAL, GearSet.COUNTER, 
                       GearSet.PENETRATION, GearSet.INJURY]:
            print(f"{gear_set.value} -> 打手/坦打套裝")
            return (GearPropBelong.DAMAGE in belongs or 
                   GearPropBelong.TANK_DAMAGE in belongs)
        
        if gear_set == GearSet.PROTECTION:
            print(f"{gear_set.value} -> 坦克套裝")
            return GearPropBelong.TANK in belongs
        
        if gear_set in [GearSet.HIT, GearSet.RESISTANCE, GearSet.SPEED, 
                       GearSet.REVENGE, GearSet.IMMUNITY]:
            print(f"{gear_set.value} -> 通用套裝")
            return True
        
        return False
    
    def detect_gear_belong(self, gear_prop: GearProp, main_prop: GearMainProp) -> List[GearPropBelong]:
        """偵測裝備歸屬"""
        belongs = []
        reduced_prop = gear_prop.reduce_main_prop(main_prop)
        
        if GearPropBelong.DAMAGE.is_gear_prop_belong(reduced_prop):
            belongs.append(GearPropBelong.DAMAGE)
        if GearPropBelong.TANK_DAMAGE.is_gear_prop_belong(reduced_prop):
            belongs.append(GearPropBelong.TANK_DAMAGE)
        if GearPropBelong.TANK.is_gear_prop_belong(reduced_prop):
            belongs.append(GearPropBelong.TANK)
        if GearPropBelong.SUPPORT.is_gear_prop_belong(reduced_prop):
            belongs.append(GearPropBelong.SUPPORT)
        
        return belongs

# ==========================================
# Main Gear Script Logic (from gear_script.py)
# ==========================================

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
        # 覆蓋預設設定，指向 gearScript2/images 目錄
        gear_script_dir = Path(__file__).parent.resolve()
        # Normalize to forward slashes
        self.image_root = str(gear_script_dir / "images").replace("\\", "/")
        self.default_threshold = 0.8
    
    def _init_ocr_configs(self):
        """初始化 OCR 配置"""
        # ... (rest of the method remains valid, just ensuring configure logs first)
        # We don't need to change this method for logging, just configure and detect_gear
        # Re-declaring it to match the context or we can skip it if using replace correctly.
        # But for 'configure' simple replacement is enough.
        # I will just replace configure and detect_gear separately? 
        # No, the tool allows replacing chunks.
        
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
            0.6
        )
        self.ocr_configs["gearLevel"] = GearOcr(
            f"{self.image_root}/gear-level-ocr",
            GearRegion(935, 168, 35, 25),
            0.85
        )
        
        # Main and Sub-properties types
        self.ocr_configs["mainPropType"] = GearOcr(
            f"{self.image_root}/main-prop-type-ocr",
            GearRegion(880, 327, 120, 35),
            0.75
        )
        self.ocr_configs["1stPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 365, 120, 30),
            0.7
        )
        self.ocr_configs["2ndPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 389, 120, 30),
            0.7
        )
        self.ocr_configs["3rdPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 410, 120, 30),
            0.7
        )
        self.ocr_configs["4thPropType"] = GearOcr(
            f"{self.image_root}/prop-type-ocr",
            GearRegion(875, 435, 120, 30),
            0.7
        )
    
    def execute(self) -> None:
        """執行腳本"""
        device_id = self.deviceId
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
        print("[DEBUG] Starting OCR detection...")

        gear_set_ocr = self.ocr_pattern(self.ocr_configs["gearSet"], source)
        gear_rarity_ocr = self.ocr_pattern(self.ocr_configs["gearRarity"], source)
        gear_type_ocr = self.ocr_pattern(self.ocr_configs["gearType"], source)
        gear_level_ocr = self.ocr_pattern(self.ocr_configs["gearLevel"], source)
        score_ocr = self.ocr_character(self.ocr_configs["score"], source)
        
        print(f"[DEBUG] Metadata OCRRaw - Set:'{gear_set_ocr}', Rarity:'{gear_rarity_ocr}', Type:'{gear_type_ocr}', Level:'{gear_level_ocr}', Score:'{score_ocr}'")

        main_type = self.ocr_pattern(self.ocr_configs["mainPropType"], source)
        main = self.ocr_character(self.ocr_configs["mainProp"], source)
        print(f"[DEBUG] MainProp OCRRaw - Type:'{main_type}', Value:'{main}'")
        
        _1st_type = self.ocr_pattern(self.ocr_configs["1stPropType"], source)
        _1st = self.ocr_character(self.ocr_configs["1stProp"], source)
        print(f"[DEBUG] 1stProp OCRRaw - Type:'{_1st_type}', Value:'{_1st}'")
        
        _2nd_type = self.ocr_pattern(self.ocr_configs["2ndPropType"], source)
        _2nd = self.ocr_character(self.ocr_configs["2ndProp"], source)
        print(f"[DEBUG] 2ndProp OCRRaw - Type:'{_2nd_type}', Value:'{_2nd}'")
        
        _3rd_type = self.ocr_pattern(self.ocr_configs["3rdPropType"], source)
        _3rd = self.ocr_character(self.ocr_configs["3rdProp"], source)
        print(f"[DEBUG] 3rdProp OCRRaw - Type:'{_3rd_type}', Value:'{_3rd}'")
        
        _4th_type = self.ocr_pattern(self.ocr_configs["4thPropType"], source)
        _4th = self.ocr_character(self.ocr_configs["4thProp"], source)
        print(f"[DEBUG] 4thProp OCRRaw - Type:'{_4th_type}', Value:'{_4th}'")
        
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
