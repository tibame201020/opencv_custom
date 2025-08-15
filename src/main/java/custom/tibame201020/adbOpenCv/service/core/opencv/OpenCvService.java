package custom.tibame201020.adbOpenCv.service.core.opencv;

import custom.tibame201020.adbOpenCv.service.core.opencv.ocr.CharacterOCR;
import custom.tibame201020.adbOpenCv.service.core.opencv.ocr.PatternOCR;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

@Service
public class OpenCvService {

    private final CharacterOCR characterOCR;
    private final PatternOCR patternOCR;

    public OpenCvService(CharacterOCR characterOCR, PatternOCR patternOCR) {
        this.characterOCR = characterOCR;
        this.patternOCR = patternOCR;
    }


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
     * ocr characters from source image path by region
     *
     * @param ocrTemplatesPath ocr templates base path
     * @param sourcePath       try ocr source image path
     * @param ocrRegion        ocr region
     * @param threshold        threshold
     * @return ocr result
     * @throws Exception e
     */
    public String ocrCharacter(String ocrTemplatesPath, String sourcePath, OpenCvDTOs.OcrRegion ocrRegion, double threshold) throws Exception {
        Mat targetImg = MatUtility.sliceRegionMat(sourcePath, ocrRegion);
        CharacterOCR characterOCR = new CharacterOCR();

        return characterOCR.executeOCR(ocrTemplatesPath, targetImg, threshold);
    }

    /**
     * ocr characters from source image mat by region
     *
     * @param ocrTemplatesPath ocr templates base path
     * @param source           try ocr source image mat
     * @param ocrRegion        ocr region
     * @param threshold        threshold
     * @return ocr result
     * @throws Exception e
     */
    public String ocrCharacter(String ocrTemplatesPath, Mat source, OpenCvDTOs.OcrRegion ocrRegion, double threshold) throws Exception {
        Mat targetImg = MatUtility.sliceRegionMat(source, ocrRegion);

        return characterOCR.executeOCR(ocrTemplatesPath, targetImg, threshold);
    }


    /**
     * ocr pattern from source image path by region
     *
     * @param ocrTemplatesPath ocr templates base path
     * @param sourcePath       try ocr source image path
     * @param ocrRegion        ocr region
     * @param threshold        threshold
     * @return ocr result
     * @throws Exception e
     */
    public String ocrPattern(String ocrTemplatesPath, String sourcePath, OpenCvDTOs.OcrRegion ocrRegion, double threshold) throws Exception {
        Mat targetImg = MatUtility.sliceRegionMat(sourcePath, ocrRegion);

        return patternOCR.executeOCR(ocrTemplatesPath, targetImg, threshold);
    }

    /**
     * ocr pattern from source image mat by region
     *
     * @param ocrTemplatesPath ocr templates base path
     * @param source           try ocr source image mat
     * @param ocrRegion        ocr region
     * @param threshold        threshold
     * @return ocr result
     * @throws Exception e
     */
    public String ocrPattern(String ocrTemplatesPath, Mat source, OpenCvDTOs.OcrRegion ocrRegion, double threshold) throws Exception {
        Mat targetImg = MatUtility.sliceRegionMat(source, ocrRegion);

        return patternOCR.executeOCR(ocrTemplatesPath, targetImg, threshold);
    }

}
