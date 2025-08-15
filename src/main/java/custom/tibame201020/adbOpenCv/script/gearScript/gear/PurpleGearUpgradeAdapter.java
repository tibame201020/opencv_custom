package custom.tibame201020.adbOpenCv.script.gearScript.gear;

import org.springframework.stereotype.Service;

@Service
public class PurpleGearUpgradeAdapter implements GearUpgradeAdapter {

    @Override
    public boolean isOkToUpgrade(GearDTOs.Gear gear) {
        GearDTOs.GearSet gearSet = gear.metadata().set();
        GearDTOs.GearType gearType = gear.metadata().type();
        GearDTOs.GearProp gearProp = gear.prop();

        if (gearType.equals(GearDTOs.GearType.SHOES)) {
            return false;
        }
        GearDTOs.GearSetType gearSetType = gearSetType(gearSet);
        if (!gearSet.equals(GearDTOs.GearSet.SPEED) || gearSetType.equals(GearDTOs.GearSetType.FOUR)) {
            return false;
        }

        int gearLevel = gear.metadata().level();
        int speed = gearProp.speed();

        if (gearLevel >= 0 && gearLevel < 3) {
            return speed >= 2;
        }
        if (gearLevel >= 3 && gearLevel < 6) {
            return speed >= 3;
        }
        if (gearLevel >= 6 && gearLevel < 9) {
            return speed >= 8;
        }
        if (gearLevel >= 9 && gearLevel < 12) {
            return speed >= 12;
        }
        if (gearLevel >= 12 && gearLevel < 15) {
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
        return speed >= 18;
    }

}
