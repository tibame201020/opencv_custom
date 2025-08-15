package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.PurpleGearUpgradeAdapter;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.RedGearUpgradeAdapter;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    private final OpenCvService openCvService;
    private final PurpleGearUpgradeAdapter purpleGearUpgradeAdapter;
    private final RedGearUpgradeAdapter redGearUpgradeAdapter;

    public MainScript(OpenCvService openCvService, PurpleGearUpgradeAdapter purpleGearUpgradeAdapter, RedGearUpgradeAdapter redGearUpgradeAdapter) {
        this.openCvService = openCvService;
        this.purpleGearUpgradeAdapter = purpleGearUpgradeAdapter;
        this.redGearUpgradeAdapter = redGearUpgradeAdapter;
    }

    public void execute() throws Exception {
        GearScript gearScript = new GearScript(openCvService, purpleGearUpgradeAdapter, redGearUpgradeAdapter);
        gearScript.execute();

    }

}
