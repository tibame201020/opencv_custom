package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

public class MatUtility {

    /**
     * get mat object from file path
     *
     * @param filePath file patch
     * @return mat object
     */
    public static Mat getMatFromFile(String filePath) {
        return Imgcodecs.imread(filePath, Imgcodecs.IMREAD_GRAYSCALE);
    }

    /**
     * get mat object from file path with mask
     *
     * @param filePath file patch
     * @return mat object
     */
    public static Mat getMatFromFileWithMask(String filePath) {
        Mat img = Imgcodecs.imread(filePath, Imgcodecs.IMREAD_UNCHANGED); // 載入包含 Alpha 通道
        if (img.empty()) {
            throw new RuntimeException("Error: Could not load image " + filePath);
        }

        Mat processedMat;

        if (img.channels() == 4) { // 如果是 RGBA 圖像
            Mat alpha = new Mat();
            Core.extractChannel(img, alpha, 3); // 提取 Alpha 通道作為遮罩

            processedMat = new Mat(img.size(), CvType.CV_8U, new Scalar(255)); // 創建一個全白的背景 Mat
            Imgproc.cvtColor(img, img, Imgproc.COLOR_BGRA2BGR); // 轉換為 BGR
            Imgproc.cvtColor(img, img, Imgproc.COLOR_BGR2GRAY); // 轉換為灰度圖

            img.copyTo(processedMat, alpha); // 將前景複製到白色背景上
        } else { // 如果是灰度圖或 RGB 圖像，沒有 Alpha 通道
            processedMat = Imgcodecs.imread(filePath, Imgcodecs.IMREAD_GRAYSCALE); // 直接載入為灰度圖
        }
        return processedMat;
    }

    /**
     * convert byte array to mat object
     *
     * @param bytes byte array
     * @return mat object
     */
    public static Mat convertBytesToMat(byte[] bytes) {
        return Imgcodecs.imdecode(new MatOfByte(bytes), Imgcodecs.IMREAD_GRAYSCALE);
    }

    /**
     * slice mat from source by region
     *
     * @param sourcePath source image path
     * @param region     region
     * @return sliced mat
     */
    public static Mat sliceRegionMat(String sourcePath, OpenCvDTOs.OcrRegion region) {
        Mat source = getMatFromFileWithMask(sourcePath);

        Rect roiRect = new Rect(region.x1(), region.y1(),
                Math.abs(region.x2() - region.x1()), Math.abs(region.y2() - region.y1()));

        return new Mat(source, roiRect);
    }

    /**
     * write mat to filePath
     *
     * @param filePath filePath
     * @param mat      mat object
     * @return saved Path
     */
    public static Path writeToFile(String filePath, Mat mat) {
        var status = Imgcodecs.imwrite(filePath, mat);

        if (!status) {
            throw new RuntimeException("error when writeToFile");
        }

        return Optional.ofNullable(filePath).map(Paths::get).orElseThrow(() -> new RuntimeException("error when writeToFile"));
    }
}
