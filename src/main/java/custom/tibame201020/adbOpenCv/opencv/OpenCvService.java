package custom.tibame201020.adbOpenCv.opencv;

import custom.tibame201020.adbOpenCv.opencv.ocr.CharacterOCR;
import custom.tibame201020.adbOpenCv.opencv.ocr.PatternOCR;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.imgproc.Imgproc;

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
     * ocr characters from
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

    //todo
    public String ocrPattern(String ocrTemplatesPath, String sourcePath, OpenCvDTOs.OcrRegion ocrRegion, double threshold) throws Exception {
        Mat targetImg = MatUtility.sliceRegionMat(sourcePath, ocrRegion);

//        MatUtility.writeToFile("roi.png", targetImg);

//        return null;
//
        PatternOCR patternOCR = new PatternOCR();

        return patternOCR.executeOCR(ocrTemplatesPath, targetImg, threshold);
    }

}
