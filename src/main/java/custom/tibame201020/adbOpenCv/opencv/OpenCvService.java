package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

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



    public void ocrNumber(Mat source, OcrRegion region) {
        // 擷取 ROI 區域並儲存為檔案
        Rect roiRect = new Rect(region.x1(), region.y1(),
                Math.abs(region.x2() - region.x1()), Math.abs(region.y2() - region.y1()));
        Mat roiImg = new Mat(source, roiRect);
        String imageFilePath = "roi.png";
        writeToFile(imageFilePath, roiImg);

        // Python 腳本路徑和 Python 解譯器路徑
        String pythonScriptPath = "path/to/your/ocr.py"; // 替換為你的 Python 腳本路徑
        String pythonExecutable = "python3"; // 或 "python"，根據你的系統設定

        try {
            // 使用 ProcessBuilder 來建構命令
            ProcessBuilder pb = new ProcessBuilder(pythonExecutable, pythonScriptPath, imageFilePath);

            // 啟動子程序
            Process p = pb.start();

            // 讀取 Python 腳本的標準輸出
            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }

            // 等待子程序結束並取得回傳碼
            int exitCode = p.waitFor();
            if (exitCode == 0) {
                // Python 腳本成功執行
                String jsonResult = output.toString();
                System.out.println("從 Python 取得的原始 JSON 結果: " + jsonResult);

                // 在這裡你可以使用 Gson 或 Jackson 等 JSON 函式庫來解析 jsonResult
                // 例如：
                // OcrResult[] results = new Gson().fromJson(jsonResult, OcrResult[].class);
                // for (OcrResult result : results) {
                //     System.out.println("辨識文字: " + result.getText());
                // }

            } else {
                // Python 腳本執行失敗
                System.err.println("Python 腳本執行失敗，回傳碼: " + exitCode);
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
    }


}
