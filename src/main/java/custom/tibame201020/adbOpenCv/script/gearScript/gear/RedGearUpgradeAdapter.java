package custom.tibame201020.adbOpenCv.script.gearScript.gear;

import java.util.ArrayList;
import java.util.List;

public class RedGearUpgradeAdapter implements GearUpgradeAdapter {


    @Override
    public boolean isOkToUpgrade(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().gearSet();
        GearDTOs.GearType gearType = gear.metadata().gearType();
        GearDTOs.GearProp gearProp = gear.gearProp();
        GearDTOs.GearMainProp gearMainProp = gear.metadata().mainProp();

        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp);
        if (!gearPropNeeded) {
            return false;
        }
        int score = gear.metadata().score();
        int gearLevel = gear.metadata().gearLevel();
        if (gearLevel == 0) {
            return score >= 27;
        }
        if (gearLevel > 0 && gearLevel < 9) {
            return score >= 40;
        }
        if (gearLevel >= 9 && gearLevel < 15) {
            return score >= 55;
        }

        return score >= 80;
    }


    @Override
    public boolean isOkToStore(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().gearSet();
        GearDTOs.GearType gearType = gear.metadata().gearType();
        GearDTOs.GearProp gearProp = gear.gearProp();
        GearDTOs.GearMainProp gearMainProp = gear.metadata().mainProp();

        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp);
        if (!gearPropNeeded) {
            return false;
        }
        int score = gear.metadata().score();

        return score >= 80;
    }

    boolean mainPropRequired(GearDTOs.GearSet gearSet, GearDTOs.GearType gearType, GearDTOs.GearMainProp mainProp) {
        if (gearType.equals(GearDTOs.GearType.WEAPON) || gearType.equals(GearDTOs.GearType.HELMET) || gearType.equals(GearDTOs.GearType.ARMOR)) {
            return true;
        }

        if (gearType.equals(GearDTOs.GearType.SHOES) && gearSet.equals(GearDTOs.GearSet.SPEED)) {
            return mainProp.equals(GearDTOs.GearMainProp.SPEED);
        }

        if (gearType.equals(GearDTOs.GearType.NECKLACE) || gearType.equals(GearDTOs.GearType.RING) || gearType.equals(GearDTOs.GearType.SHOES)) {
            return !(mainProp.equals(GearDTOs.GearMainProp.ATK_FLAT) ||
                    mainProp.equals(GearDTOs.GearMainProp.LIFE_FLAT) ||
                    mainProp.equals(GearDTOs.GearMainProp.DEF_FLAT));

        }

        return false;
    }

    boolean gearPropNeeded(GearDTOs.GearSet gearSet, GearDTOs.GearProp gearProp) {
        List<GearDTOs.GearPropBelong> belongs = detectGearBelong(gearProp);

        return switch (gearSet) {
            case ATTACK -> belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            case DESTRUCTION ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case DEFENSE -> true;
            case HEALTH -> true;
            case HIT -> true;
            case RESISTANCE -> true;
            case CRITICAL ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case SPEED -> true;
            case REVENGE -> true;
            case LIFE_STEAL -> true;
            case COUNTER ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case DUAL_ATTACK -> true;
            case IMMUNITY -> true;
            case RAGE -> belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            case PENETRATION ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case INJURY ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case PROTECTION -> belongs.contains(GearDTOs.GearPropBelong.TANK);
            case TORRENT -> belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
        };
    }

    List<GearDTOs.GearPropBelong> detectGearBelong(GearDTOs.GearProp gearProp) {
        List<GearDTOs.GearPropBelong> belongs = new ArrayList<>();
        if (GearDTOs.GearPropBelong.DAMAGE.isGearPropBelong(gearProp)) {
            belongs.add(GearDTOs.GearPropBelong.DAMAGE);
        }
        if (GearDTOs.GearPropBelong.TANK_DAMAGE.isGearPropBelong(gearProp)) {
            belongs.add(GearDTOs.GearPropBelong.TANK_DAMAGE);
        }
        if (GearDTOs.GearPropBelong.TANK.isGearPropBelong(gearProp)) {
            belongs.add(GearDTOs.GearPropBelong.TANK);
        }
        if (GearDTOs.GearPropBelong.SUPPORT.isGearPropBelong(gearProp)) {
            belongs.add(GearDTOs.GearPropBelong.SUPPORT);
        }
        return belongs;
    }
}
