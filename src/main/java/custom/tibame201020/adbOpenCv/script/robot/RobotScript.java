package custom.tibame201020.adbOpenCv.script.robot;

import custom.tibame201020.adbOpenCv.script.Script;
import custom.tibame201020.adbOpenCv.service.platform.robot.RobotPlatform;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

@Service
@Lazy
public class RobotScript implements Script {

    private final RobotPlatform robotPlatform;

    public RobotScript(RobotPlatform robotPlatform) {
        this.robotPlatform = robotPlatform;
    }

    @Override
    public void execute() throws Exception {
        System.setProperty("java.awt.headless", "false");

        var testSnapshot = "robot-snapshot.png";
        var snapshotPath = robotPlatform.snapshot(testSnapshot);
        System.err.println(snapshotPath);

        var result = robotPlatform.findImage(testSnapshot);
        System.err.printf("x: %s, y: %s", result.point().x, result.point().x);
    }
}
