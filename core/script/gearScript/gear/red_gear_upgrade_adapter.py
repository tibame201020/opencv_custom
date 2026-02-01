"""
紅裝升級適配器
"""
from typing import List
from .gear_upgrade_adapter import GearUpgradeAdapter
from .gear_dtos import (
    Gear, GearSet, GearType, GearMainProp, GearProp, GearPropBelong
)


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









