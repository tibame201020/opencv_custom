package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.*;
import org.opencv.imgproc.Imgproc;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class NumberOCR {

    public String ocrFromImage(Mat targetImg, Map<String, Mat> templates, double threshold, double scale) {

//        Mat targetImg = Imgcodecs.imread(imagePath, Imgcodecs.IMREAD_GRAYSCALE);
//        if (targetImg.empty()) {
//            System.err.println("Error: Could not load image " + imagePath);
//            return "";
//        }

        List<MatchResult> results = new ArrayList<>();

        // 遍歷所有模板進行匹配
        for (Map.Entry<String, Mat> entry : templates.entrySet()) {
            String character = entry.getKey();
            Mat origTemplate = entry.getValue();
            Mat template = new Mat();
            Imgproc.resize(origTemplate, template, new Size(), scale, scale, Imgproc.INTER_LINEAR);

            int w = template.cols();
            int h = template.rows();

            Mat res = new Mat();
            Imgproc.matchTemplate(targetImg, template, res, Imgproc.TM_CCOEFF_NORMED);

            // 尋找所有匹配度高於閾值的位置
            Core.MinMaxLocResult mmr;
            while (true) {
                mmr = Core.minMaxLoc(res);
                if (mmr.maxVal >= threshold) {
                    Point matchLoc = mmr.maxLoc;
                    results.add(new MatchResult(character, matchLoc.x));

                    // 將已匹配的區域設為 0，避免重複檢測
                    Rect rect = new Rect((int) matchLoc.x, (int) matchLoc.y, w, h);
                    Imgproc.rectangle(res, rect, new Scalar(0), -1);
                } else {
                    break;
                }
            }
        }

        // 根據 x 座標排序
        results.sort(Comparator.comparingDouble(r -> r.x));

        // 組合字串並回傳
        StringBuilder sb = new StringBuilder();
        for (MatchResult res : results) {
            sb.append(res.character);
        }
        return sb.toString();
    }

    private static class MatchResult {
        String character;
        double x;

        public MatchResult(String character, double x) {
            this.character = character;
            this.x = x;
        }
    }
}
