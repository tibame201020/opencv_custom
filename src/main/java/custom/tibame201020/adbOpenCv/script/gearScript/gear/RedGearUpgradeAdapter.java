package custom.tibame201020.adbOpenCv.script.gearScript.gear;

import java.util.ArrayList;
import java.util.List;

public class RedGearUpgradeAdapter implements GearUpgradeAdapter {

    @Override
    public boolean isOkToUpgrade(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearType gearType = gear.metadata().type();
        GearDTOs.GearProp gearProp = gear.prop();
        GearDTOs.GearMainProp gearMainProp = gear.metadata().mainProp();

        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            System.err.println("--- main prop not required");
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp);
        if (!gearPropNeeded) {
            System.err.println("--- gear prop not needed");
            return false;
        }

        int score = gear.metadata().score();
        var calcScore = gearProp.calcScore();
        int gearLevel = gear.metadata().level();

        if (gearLevel >= 0 && gearLevel < 9) {
            return score >= 25;
        }

        if (gearLevel >= 9 && gearLevel < 12) {
            return score >= 60;
        }

        if (gearLevel >= 12) {
            return score >= 70;
        }

        return score >= 85 || calcScore >= 70;
    }


    @Override
    public boolean isOkToStore(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearType gearType = gear.metadata().type();
        GearDTOs.GearProp gearProp = gear.prop();
        GearDTOs.GearMainProp gearMainProp = gear.metadata().mainProp();

        var speed = gear.prop().speed();
        if (speed >= 20 && !gear.metadata().type().equals(GearDTOs.GearType.SHOES)) {
            System.err.println("--- speed enough");
            return true;
        }

        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp);
        if (!gearPropNeeded) {
            return false;
        }

        int score = gear.metadata().score();
        var calcScore = gearProp.calcScore();
        System.err.println("score: " + score + ", calcScore: " + calcScore);

        var type = gear.metadata().type();
        if (type.equals(GearDTOs.GearType.SHOES) || type.equals(GearDTOs.GearType.NECKLACE) || type.equals(GearDTOs.GearType.RING)) {
            return score >= 85;
        }

        return score >= 85 || calcScore >= 70;
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
        System.err.println("belongs: " + belongs);

        return switch (gearSet) {
            case ATTACK, RAGE, TORRENT -> belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            case DESTRUCTION, CRITICAL, COUNTER, PENETRATION, INJURY ->
                    belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            case PROTECTION -> belongs.contains(GearDTOs.GearPropBelong.TANK);
            case DEFENSE, HEALTH, HIT, RESISTANCE, SPEED, REVENGE, LIFE_STEAL, DUAL_ATTACK, IMMUNITY ->
                    !belongs.isEmpty();
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
