package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.robot.RobotService;
import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.PurpleGearUpgradeAdapter;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.RedGearUpgradeAdapter;
import custom.tibame201020.adbOpenCv.script.robot.RobotScript;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    private final OpenCvService openCvService;
    private final PurpleGearUpgradeAdapter purpleGearUpgradeAdapter;
    private final RedGearUpgradeAdapter redGearUpgradeAdapter;
    private final RobotService robotService;

    public MainScript(OpenCvService openCvService, PurpleGearUpgradeAdapter purpleGearUpgradeAdapter, RedGearUpgradeAdapter redGearUpgradeAdapter, RobotService robotService) {
        this.openCvService = openCvService;
        this.purpleGearUpgradeAdapter = purpleGearUpgradeAdapter;
        this.redGearUpgradeAdapter = redGearUpgradeAdapter;
        this.robotService = robotService;
    }

    public void execute() throws Exception {
        GearScript gearScript = new GearScript(openCvService, purpleGearUpgradeAdapter, redGearUpgradeAdapter);
        gearScript.execute();

//        RobotScript robotScript = new RobotScript(robotService);
//        robotScript.execute();
    }

}
