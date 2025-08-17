package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.script.evilHunter.EvilHunterScript;
import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import custom.tibame201020.adbOpenCv.script.robot.RobotScript;
import custom.tibame201020.adbOpenCv.service.platform.adb.AdbPlatform;
import custom.tibame201020.adbOpenCv.service.platform.robot.RobotPlatform;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Scanner;

@Service
public class MainScript {

    private final AdbPlatform adbPlatform;
    private final RobotPlatform robotPlatform;

    public MainScript(AdbPlatform adbPlatform, RobotPlatform robotPlatform) {
        this.adbPlatform = adbPlatform;
        this.robotPlatform = robotPlatform;
    }

    public void execute() throws Exception {

//        Script script = new GearScript(adbPlatform);
//        script.execute();

        Scanner scanner = new Scanner(System.in);
        var scripts = List.of("gear", "robot", "evil-hunter");

        System.out.println("choose script: " + scripts);
        var chosenScript = scanner.nextLine();
        switch (chosenScript) {
            case "gear" -> {
                Script script = new GearScript(adbPlatform);
                script.execute();
            }
            case "robot" -> {
                Script script = new RobotScript(robotPlatform);
                script.execute();
            }
            case "evil-hunter" -> {
                Script script = new EvilHunterScript(adbPlatform);
                script.execute();
            }
            default -> {
                System.out.println("invalid script");
            }
        }

        scanner.close();
    }

}
