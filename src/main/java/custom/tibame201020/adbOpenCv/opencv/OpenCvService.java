package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import java.util.LinkedHashMap;
import java.util.Map;

public class OpenCvService {

    /**
     * find match target on src
     *
     * @param source source
     * @param target target
     * @return MatchPattern
     */
    public OpenCvDTOs.MatchPattern findMatch(Mat source, Mat target) {
        int match_method = Imgproc.TM_SQDIFF_NORMED;

        Mat result = new Mat(source.rows(), source.cols(), CvType.CV_32FC1);
        Imgproc.matchTemplate(source, target, result, match_method);
        Core.MinMaxLocResult mmr = Core.minMaxLoc(result);

        Point point = mmr.minLoc;
        point.x = point.x + target.cols() / 2.0;
        point.y = point.y + target.rows() / 2.0;

        return new OpenCvDTOs.MatchPattern(mmr.minVal, mmr.minLoc);
    }

    /**
     * get mat object from file path
     *
     * @param filePath file patch
     * @return mat object
     */
    public Mat getMatFromFile(String filePath) {
        return Imgcodecs.imread(filePath, Imgcodecs.IMREAD_GRAYSCALE);
    }

    /**
     * get mat object from file path with mask
     *
     * @param filePath file patch
     * @return mat object
     */
    public Mat getMatFromFileWithMask(String filePath) {
        Mat img = Imgcodecs.imread(filePath, Imgcodecs.IMREAD_UNCHANGED); // 載入包含 Alpha 通道
        if (img.empty()) {
            System.err.println("Error: Could not load image " + filePath);
            return new Mat();
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
    public Mat convertBytesToMat(byte[] bytes) {
        return Imgcodecs.imdecode(new MatOfByte(bytes), Imgcodecs.IMREAD_GRAYSCALE);
    }

    /**
     * write mat to filePath
     *
     * @param filePath filePath
     * @param mat      mat object
     */
    public void writeToFile(String filePath, Mat mat) {
        Imgcodecs.imwrite(filePath, mat);
    }

    public record OcrPath(
            String zero,
            String one,
            String two,
            String three,
            String four,
            String five,
            String six,
            String seven,
            String eight,
            String nine,
            String dot,
            String percent
    ) {
    }

    public record OcrRegion(
            int x1,
            int y1,
            int x2,
            int y2
    ) {
    }

    public String ocrNumber(OcrPath ocrPath, Mat source, OcrRegion region, double threshold) {
        // 擷取 ROI 區域
        Rect roiRect = new Rect(region.x1(), region.y1(),
                Math.abs(region.x2() - region.x1()), Math.abs(region.y2() - region.y1()));
        Mat roiImg = new Mat(source, roiRect);

        writeToFile("roi.png", roiImg);


        // 預載模板
        Map<String, Mat> templates = new LinkedHashMap<>();
        templates.put("0", getMatFromFileWithMask(ocrPath.zero()));
        templates.put("1", getMatFromFileWithMask(ocrPath.one()));
        templates.put("2", getMatFromFileWithMask(ocrPath.two()));
        templates.put("3", getMatFromFileWithMask(ocrPath.three()));
        templates.put("4", getMatFromFileWithMask(ocrPath.four()));
        templates.put("5", getMatFromFileWithMask(ocrPath.five()));
        templates.put("6", getMatFromFileWithMask(ocrPath.six()));
        templates.put("7", getMatFromFileWithMask(ocrPath.seven()));
        templates.put("8", getMatFromFileWithMask(ocrPath.eight()));
        templates.put("9", getMatFromFileWithMask(ocrPath.nine()));
        templates.put(".", getMatFromFileWithMask(ocrPath.dot()));
        templates.put("%", getMatFromFileWithMask(ocrPath.percent()));

        NumberOCR numberOCR = new NumberOCR();

        var result = numberOCR.ocrFromImage(roiImg, templates, threshold);
        writeToFile(result + ".png", roiImg);

        return result;
    }


}
