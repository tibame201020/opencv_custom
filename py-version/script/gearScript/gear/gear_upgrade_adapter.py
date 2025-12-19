"""
Gear 升級適配器介面
"""
from abc import ABC, abstractmethod
from typing import List
from .gear_dtos import Gear, GearSet, GearSetType


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


