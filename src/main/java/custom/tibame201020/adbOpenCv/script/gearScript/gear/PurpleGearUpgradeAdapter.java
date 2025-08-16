package custom.tibame201020.adbOpenCv.script.gearScript.gear;

public class PurpleGearUpgradeAdapter implements GearUpgradeAdapter {

    @Override
    public boolean isOkToUpgrade(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearType gearType = gear.metadata().type();
        GearDTOs.GearProp gearProp = gear.prop();

        if (gearType.equals(GearDTOs.GearType.SHOES)) {
            System.err.println("[紫裝] 不需要部位: " + gearType.text);
            return false;
        }
        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) && gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            System.err.println("[紫裝] 不需要套裝: " + gearSet.text);
            return false;
        }

        int gearLevel = gear.metadata().level();
        int speed = gearProp.speed();

        if (gearLevel >= 0 && gearLevel < 3) {
            System.err.println("[紫裝] 速度: " + speed + ", 強化等級: " + gearLevel + ", 需求速度: 2");
            return speed >= 2;
        }
        if (gearLevel >= 3 && gearLevel < 6) {
            System.err.println("[紫裝] 速度: " + speed + ", 強化等級: " + gearLevel + ", 需求速度: 5");
            return speed >= 5;
        }
        if (gearLevel >= 6 && gearLevel < 9) {
            System.err.println("[紫裝] 速度: " + speed + ", 強化等級: " + gearLevel + ", 需求速度: 8");
            return speed >= 8;
        }
        if (gearLevel >= 9 && gearLevel < 12) {
            System.err.println("[紫裝] 速度: " + speed + ", 強化等級: " + gearLevel + ", 需求速度: 12");
            return speed >= 12;
        }
        if (gearLevel >= 12 && gearLevel < 15) {
            System.err.println("[紫裝] 速度: " + speed + ", 強化等級: " + gearLevel + ", 需求速度: 12");
            return speed >= 12;
        }

        return speed >= 18;
    }

    @Override
    public boolean isOkToStore(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearProp gearProp = gear.prop();

        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }
        int speed = gearProp.speed();

        System.err.println("[紫裝] 速度: " + speed + ", 需求速度: 18");
        return speed >= 18;
    }

}
