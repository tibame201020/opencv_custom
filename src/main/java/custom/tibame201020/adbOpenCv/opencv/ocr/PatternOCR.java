package custom.tibame201020.adbOpenCv.opencv.ocr;

import org.opencv.core.*;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PatternOCR implements MatchOCRAdaptor {

    @Override
    public String executeOCR(String ocrTemplatesPath, Mat targetImg, double threshold) throws Exception {
        var templates = loadTemplateMatMap(ocrTemplatesPath);
        String result = "";

        // 遍歷所有模板進行匹配
        for (Map.Entry<String, Mat> entry : templates.entrySet()) {
            String pattern = entry.getKey();
            Mat template = entry.getValue();

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
                    result = pattern;
                    // 將已匹配的區域設為 0，避免重複檢測
                    Rect rect = new Rect((int) matchLoc.x, (int) matchLoc.y, w, h);
                    Imgproc.rectangle(res, rect, new Scalar(0), -1);
                } else {
                    break;
                }
            }
        }

        return result;
    }
}
