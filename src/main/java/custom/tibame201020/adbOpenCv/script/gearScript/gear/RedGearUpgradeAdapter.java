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
                System.err.println("--- 速度足夠: " + speed + ", 強化等級: " + gearLevel + ", 需求: 5");
                return true;
            }

            if ((gearLevel >= 9 && gearLevel < 12) && speed >= 10) {
                System.err.println("--- 速度足夠: " + speed + ", 強化等級: " + gearLevel + ", 需求: 10");
                return true;
            }

            if ((gearLevel >= 12) && speed >= 15) {
                System.err.println("--- 速度足夠: " + speed + ", 強化等級: " + gearLevel + ", 需求: 15");
                return true;
            }
        }


        boolean mainPropRequired = mainPropRequired(gearSet, gearType, gearMainProp);
        if (!mainPropRequired) {
            System.err.println("--- 裝備主屬性不符合: " + gearMainProp.text + ", 部位: " + gearType.text + ", 套裝: " + gearSet.text);
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
            System.err.println("--- 裝備評分: " + score + ", 強化等級: " + gearLevel + ", 評分需求: 22");
            return score >= 22;

        }

        if (gearLevel >= 3 && gearLevel < 6) {
            System.err.println("--- 裝備評分: " + score + ", 強化等級: " + gearLevel + ", 評分需求: 32");
            return score >= 32;

        }

        if (gearLevel >= 6 && gearLevel < 9) {
            System.err.println("--- 裝備評分: " + score + ", 強化等級: " + gearLevel + ", 評分需求: 45");
            return score >= 45;

        }

        if (gearLevel >= 9 && gearLevel < 12) {
            System.err.println("--- 裝備評分: " + score + ", 強化等級: " + gearLevel + ", 評分需求: 60");
            return score >= 60;
        }

        if (gearLevel >= 12) {
            System.err.println("--- 裝備評分: " + score + ", 強化等級: " + gearLevel + ", 評分需求: 70");
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

    boolean gearPropNeeded(GearDTOs.GearSet gearSet, GearDTOs.GearProp gearProp, GearDTOs.GearMainProp mainProp) {
        List<GearDTOs.GearPropBelong> belongs = detectGearBelong(gearProp, mainProp);
        System.err.println("裝備適性: " + belongs.stream().map(belong -> belong.text).toList());

        if (belongs.isEmpty()) {
            return false;
        }

        return switch (gearSet) {
            case ATTACK, RAGE, TORRENT, LIFE_STEAL, DUAL_ATTACK -> {
                System.err.println(gearSet.text + " -> 打手套裝");
                yield belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            }
            case HEALTH, DEFENSE -> {
                System.err.println(gearSet.text + " -> 坦打/坦克/輔助套裝");
                yield !belongs.contains(GearDTOs.GearPropBelong.DAMAGE);
            }
            case DESTRUCTION, CRITICAL, COUNTER, PENETRATION, INJURY -> {
                System.err.println(gearSet.text + " -> 打手/坦打套裝");
                yield belongs.contains(GearDTOs.GearPropBelong.DAMAGE) || belongs.contains(GearDTOs.GearPropBelong.TANK_DAMAGE);
            }
            case PROTECTION -> {
                System.err.println(gearSet.text + " -> 坦克套裝");
                yield belongs.contains(GearDTOs.GearPropBelong.TANK);
            }
            case HIT, RESISTANCE, SPEED, REVENGE, IMMUNITY -> {
                System.err.println(gearSet.text + " -> 通用套裝");
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
