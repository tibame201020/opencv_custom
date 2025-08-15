package custom.tibame201020.adbOpenCv.opencv.ocr;

import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Rect;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class CharacterOCR implements MatchOCRAdaptor {

    record MatchResult(
            String character,
            double x
    ) {
    }

    @Override
    public String executeOCR(String ocrTemplatesPath, Mat targetImg, double threshold) throws Exception {
        var templates = loadTemplateMatMap(ocrTemplatesPath);

        List<MatchResult> results = new ArrayList<>();

        for (Map.Entry<String, Mat> entry : templates.entrySet()) {
            String character = entry.getKey();
            Mat template = entry.getValue();

            Mat res = new Mat();
            Imgproc.matchTemplate(targetImg, template, res, Imgproc.TM_CCOEFF_NORMED);

            // 將 res 中 >= threshold 的位置設為 255，其餘設為 0
            Mat mask = new Mat();
            Imgproc.threshold(res, mask, threshold, 255, Imgproc.THRESH_BINARY);

            // 轉成 8-bit 單通道
            mask.convertTo(mask, CvType.CV_8U);

            // 找出所有匹配區塊
            List<MatOfPoint> contours = new ArrayList<>();
            Mat hierarchy = new Mat();
            Imgproc.findContours(mask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);

            for (MatOfPoint contour : contours) {
                Rect rect = Imgproc.boundingRect(contour);
                results.add(new MatchResult(character, rect.x));
            }
        }

        // 根據 x 座標排序
        results.sort(Comparator.comparingDouble(r -> r.x));

        StringBuilder sb = new StringBuilder();
        for (MatchResult res : results) {
            sb.append(res.character());
        }
        return sb.toString();
    }
}
