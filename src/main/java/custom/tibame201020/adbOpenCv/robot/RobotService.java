package custom.tibame201020.adbOpenCv.robot;

import custom.tibame201020.adbOpenCv.opencv.MatUtility;
import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
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
public class RobotService {
    private final OpenCvService openCvService;

    public RobotService(OpenCvService openCvService) {
        this.openCvService = openCvService;
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
