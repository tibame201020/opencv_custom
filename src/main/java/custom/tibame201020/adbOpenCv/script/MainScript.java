package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import custom.tibame201020.adbOpenCv.service.platform.adb.AdbPlatform;
import custom.tibame201020.adbOpenCv.service.platform.robot.RobotPlatform;
import org.springframework.stereotype.Service;

@Service
public class MainScript {

    private final AdbPlatform adbPlatform;
    private final RobotPlatform robotPlatform;

    public MainScript(AdbPlatform adbPlatform, RobotPlatform robotPlatform) {
        this.adbPlatform = adbPlatform;
        this.robotPlatform = robotPlatform;
    }

    public void execute() throws Exception {
        Script gearScript = new GearScript(adbPlatform);
        gearScript.execute();

//        RobotScript robotScript = new RobotScript(robotService);
//        robotScript.execute();
    }

}
