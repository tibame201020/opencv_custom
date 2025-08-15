package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.adb.AdbServer;
import custom.tibame201020.adbOpenCv.robot.RobotService;
import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import org.springframework.stereotype.Component;

@Component
public class MainScript {


    private final AdbServer adbServer;

    private final RobotService robotService;

    public MainScript(AdbServer adbServer, RobotService robotService) {

        this.adbServer = adbServer;

        this.robotService = robotService;
    }

    public void execute() throws Exception {
        GearScript gearScript = new GearScript(adbServer);
        gearScript.execute();

//        RobotScript robotScript = new RobotScript(robotService);
//        robotScript.execute();
    }

}
