"""
紫裝升級適配器
"""
from .gear_upgrade_adapter import GearUpgradeAdapter
from .gear_dtos import Gear, GearSet, GearSetType, GearType


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


