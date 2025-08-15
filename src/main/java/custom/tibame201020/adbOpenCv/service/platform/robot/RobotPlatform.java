package custom.tibame201020.adbOpenCv.service.platform.robot;

import custom.tibame201020.adbOpenCv.service.core.opencv.MatUtility;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.service.platform.PlatformService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@Lazy
public class RobotPlatform implements PlatformService {
    private final OpenCvService openCvService;

    public RobotPlatform(OpenCvService openCvService) {
        this.openCvService = openCvService;
    }

    @Override
    public OpenCvService getOpenCvService() {
        return openCvService;
    }

    /**
     * took snapshot from robot
     *
     * @param savePath save snapshot image path
     * @return saved image path
     * @throws Exception e
     */
    public String snapshot(String savePath) throws Exception {
        Robot robot = new Robot();
        Rectangle rectangle = new Rectangle(Toolkit.getDefaultToolkit().getScreenSize());
        var screenCapture = robot.createScreenCapture(rectangle);

        File saveFile = new File(savePath);
        ImageIO.write(screenCapture, "png", saveFile);

        return saveFile.getAbsolutePath();
    }

    public OpenCvDTOs.MatchPattern findImage(String targetImagePath) throws Exception {
        var snapshotImageName = UUID.randomUUID() + ".png";
        var snapshotPath = snapshot(snapshotImageName);

        var snapshotMat = MatUtility.getMatFromFile(snapshotPath);
        var targetMat = MatUtility.getMatFromFile(targetImagePath);
        var result = openCvService.findMatch(snapshotMat, targetMat);

        Files.deleteIfExists(Path.of(snapshotPath));

        return result;
    }
}
