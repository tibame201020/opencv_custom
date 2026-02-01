"""
Gear DTOs - 裝備資料傳輸物件
"""
from dataclasses import dataclass
from enum import Enum
from typing import List


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









