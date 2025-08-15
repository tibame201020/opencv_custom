package custom.tibame201020.adbOpenCv.script.gearScript.gear;

public class PurpleGearUpgradeAdapter implements GearUpgradeAdapter {

    @Override
    public boolean isOkToUpgrade(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().gearSet();
        GearDTOs.GearType gearType = gear.metadata().gearType();
        GearDTOs.GearProp gearProp = gear.gearProp();

        if (gearType.equals(GearDTOs.GearType.SHOES)) {
            return false;
        }
        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }

        int gearLevel = gear.metadata().gearLevel();

        int speed = gearProp.speed();

        if (gearLevel == 0) {
            return speed >= 3;
        }
        if (gearLevel < 3) {
            return speed >= 4;
        }
        if (gearLevel < 9) {
            return speed >= 5;
        }
        if (gearLevel < 15) {
            return speed >= 10;
        }

        return speed >= 18;
    }

    @Override
    public boolean isOkToStore(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().gearSet();
        GearDTOs.GearProp gearProp = gear.gearProp();

        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }
        int speed = gearProp.speed();
        return speed >= 18;
    }

}
