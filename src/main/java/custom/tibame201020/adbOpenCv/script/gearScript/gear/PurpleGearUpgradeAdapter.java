package custom.tibame201020.adbOpenCv.script.gearScript.gear;

public class PurpleGearUpgradeAdapter implements GearUpgradeAdapter {

    @Override
    public boolean isOkToUpgrade(GearDTOs.GearSet gearSet, GearDTOs.GearType gearType, int currentLevel, GearDTOs.GearProp gearProp) {
        if (gearType.equals(GearDTOs.GearType.SHOES)) {
            return false;
        }
        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }

        int speed = gearProp.speed();

        if (currentLevel == 0) {
            return speed >= 3;
        }
        if (currentLevel < 3) {
            return speed >= 4;
        }
        if (currentLevel < 9) {
            return speed >= 5;
        }
        if (currentLevel < 15) {
            return speed >= 10;
        }

        return speed >= 18;
    }

    @Override
    public boolean isOkToStore(GearDTOs.GearSet gearSet, GearDTOs.GearType gearType, GearDTOs.GearProp current) {
        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }
        int speed = current.speed();
        return speed >= 18;
    }

}
