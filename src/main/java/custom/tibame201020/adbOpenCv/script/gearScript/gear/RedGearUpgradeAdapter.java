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
        int gearLevel = gear.metadata().level();

        var speed = gear.prop().speed();

        if (!gear.metadata().type().equals(GearDTOs.GearType.SHOES)) {
            if ((gearLevel >= 0 && gearLevel < 9) && speed >= 5) {
                System.err.println("--- 速度足夠: " + speed);
                return true;
            }

            if ((gearLevel >= 9 && gearLevel < 12) && speed >= 10) {
                System.err.println("--- 速度足夠: " + speed);
                return true;
            }

            if ((gearLevel >= 12) && speed >= 15) {
                System.err.println("--- 速度足夠: " + speed);
                return true;
            }
        }


        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            System.err.println("--- 裝備主屬性不符合: " + gearMainProp + ", 部位: " + gearType + ", 套裝: " + gearSet);
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp, gearMainProp);
        if (!gearPropNeeded) {
            System.err.println("--- 裝備屬性不符合需求");
            return false;
        }

        int score = gear.metadata().score();
        var calcScore = gearProp.reduceMainProp(gearMainProp).calcScore();

        System.err.println("score: " + score + ", calcScore: " + calcScore);

        if (gearLevel >= 0 && gearLevel < 3) {
            var result = score >= 22;
            if (!result) {
                System.err.println("--- 裝備評分不足: " + score + ", 強化等級: " + gearLevel);
            }
            return result;
        }

        if (gearLevel >= 3 && gearLevel < 6) {
            var result = score >= 32;
            if (!result) {
                System.err.println("--- 裝備評分不足: " + score + ", 強化等級: " + gearLevel);
            }
            return result;
        }

        if (gearLevel >= 6 && gearLevel < 9) {
            var result = score >= 45;
            if (!result) {
                System.err.println("--- 裝備評分不足: " + score + ", 強化等級: " + gearLevel);
            }
            return result;
        }

        if (gearLevel >= 9 && gearLevel < 12) {
            var result = score >= 60;
            if (!result) {
                System.err.println("--- 裝備評分不足: " + score + ", 強化等級: " + gearLevel);
            }
            return result;
        }

        if (gearLevel >= 12) {
            var result = score >= 70;
            if (!result) {
                System.err.println("--- 裝備評分不足: " + score + ", 強化等級: " + gearLevel);
            }
            return result;
        }

        return score >= 85;
    }


    @Override
    public boolean isOkToStore(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearType gearType = gear.metadata().type();
        GearDTOs.GearProp gearProp = gear.prop();
        GearDTOs.GearMainProp gearMainProp = gear.metadata().mainProp();

        var speed = gear.prop().speed();
        if (speed >= 20 && !gear.metadata().type().equals(GearDTOs.GearType.SHOES)) {
            System.err.println("--- 速度足夠");
            return true;
        }

        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            return false;
        }
        boolean gearPropNeeded = gearPropNeeded(gearSet, gearProp, gearMainProp);
        if (!gearPropNeeded) {
            return false;
        }

        int score = gear.metadata().score();
        var calcScore = gearProp.reduceMainProp(gearMainProp).calcScore();
        System.err.println("score: " + score + ", calcScore: " + calcScore);

        return score >= 85;
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

    boolean gearPropNeeded(GearDTOs.GearSet gearSet, GearDTOs.GearProp gearProp, GearDTOs.GearMainProp mainProp) {
        List<GearDTOs.GearPropBelong> belongs = detectGearBelong(gearProp, mainProp);
        System.err.println("裝備適性: " + belongs);

        if (belongs.isEmpty()) {
            return false;
        }

        return switch (gearSet) {
            case ATTACK, RAGE, TORRENT, LIFE_STEAL, DUAL_ATTACK -> {
                System.err.println("打手 套裝: " + gearSet);
                yield belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            }
            case HEALTH, DEFENSE -> {
                System.err.println("坦打/坦克/輔助 套裝: " + gearSet);
                yield !belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            }
            case DESTRUCTION, CRITICAL, COUNTER, PENETRATION, INJURY ->
            {
                System.err.println("打手/坦打 套裝: " + gearSet);
                yield belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            }
            case PROTECTION -> {
                System.err.println("坦克 套裝: " + gearSet);
                yield belongs.contains(GearDTOs.GearPropBelong.TANK);
            }
            case HIT, RESISTANCE, SPEED, REVENGE, IMMUNITY -> {
                System.err.println("通用 套裝: " + gearSet);
                yield true;
            }
        };
    }

    List<GearDTOs.GearPropBelong> detectGearBelong(GearDTOs.GearProp gearProp, GearDTOs.GearMainProp mainProp) {
        List<GearDTOs.GearPropBelong> belongs = new ArrayList<>();
        if (GearDTOs.GearPropBelong.DAMAGE.isGearPropBelong(gearProp.reduceMainProp(mainProp))) {
            belongs.add(GearDTOs.GearPropBelong.DAMAGE);
        }
        if (GearDTOs.GearPropBelong.TANK_DAMAGE.isGearPropBelong(gearProp.reduceMainProp(mainProp))) {
            belongs.add(GearDTOs.GearPropBelong.TANK_DAMAGE);
        }
        if (GearDTOs.GearPropBelong.TANK.isGearPropBelong(gearProp.reduceMainProp(mainProp))) {
            belongs.add(GearDTOs.GearPropBelong.TANK);
        }
        if (GearDTOs.GearPropBelong.SUPPORT.isGearPropBelong(gearProp.reduceMainProp(mainProp))) {
            belongs.add(GearDTOs.GearPropBelong.SUPPORT);
        }
        return belongs;
    }
}
