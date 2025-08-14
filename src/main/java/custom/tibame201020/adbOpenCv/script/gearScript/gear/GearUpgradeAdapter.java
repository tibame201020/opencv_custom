package custom.tibame201020.adbOpenCv.script.gearScript.gear;

import java.util.List;

public interface GearUpgradeAdapter {

    boolean isOkToUpgrade(
            GearDTOs.GearSet gearSet,
            GearDTOs.GearType gearType,
            int currentLevel,
            GearDTOs.GearProp gearProp
    );

    boolean isOkToStore(
            GearDTOs.GearSet gearSet,
            GearDTOs.GearType gearType,
            GearDTOs.GearProp gearProp
    );

    List<GearDTOs.GearSet> GEAR_SET_FOUR_TYPES = List.of(
            GearDTOs.GearSet.ATTACK,
            GearDTOs.GearSet.DESTRUCTION,
            GearDTOs.GearSet.SPEED,
            GearDTOs.GearSet.RAGE,
            GearDTOs.GearSet.REVENGE,
            GearDTOs.GearSet.COUNTER,
            GearDTOs.GearSet.INJURY,
            GearDTOs.GearSet.LIFE_STEAL,
            GearDTOs.GearSet.PROTECTION
    );

    List<GearDTOs.GearSet> GEAR_SET_TWO_TYPES = List.of(
            GearDTOs.GearSet.DEFENSE,
            GearDTOs.GearSet.HEALTH,
            GearDTOs.GearSet.HIT,
            GearDTOs.GearSet.RESISTANCE,
            GearDTOs.GearSet.CRITICAL,
            GearDTOs.GearSet.DUAL_ATTACK,
            GearDTOs.GearSet.IMMUNITY,
            GearDTOs.GearSet.PENETRATION,
            GearDTOs.GearSet.TORRENT

    );

    default GearDTOs.GearSetType gearSetType(GearDTOs.GearSet gearSet) {
        if (GEAR_SET_FOUR_TYPES.contains(gearSet)) {
            return GearDTOs.GearSetType.FOUR;
        }
        if (GEAR_SET_TWO_TYPES.contains(gearSet)) {
            return GearDTOs.GearSetType.TWO;
        }
        throw new RuntimeException("un caught gear set type");
    }
}
