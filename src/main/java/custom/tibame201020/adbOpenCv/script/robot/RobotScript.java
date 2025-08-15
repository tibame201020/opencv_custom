package custom.tibame201020.adbOpenCv.script.robot;

import custom.tibame201020.adbOpenCv.robot.RobotService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
@Lazy
public class RobotScript {

    private final RobotService robotService;

    public RobotScript(RobotService robotService) {
        this.robotService = robotService;
    }

    public void execute() throws Exception {
        System.setProperty("java.awt.headless", "false");

        var testSnapshot = "robot-snapshot.png";
        var snapshotPath = robotService.snapshot(testSnapshot);
        System.err.println(snapshotPath);

        var result = robotService.findImage(testSnapshot);
        System.err.printf("x: %s, y: %s", result.point().x, result.point().x);
    }
}
