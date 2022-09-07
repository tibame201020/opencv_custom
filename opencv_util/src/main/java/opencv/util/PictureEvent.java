package opencv.util;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import static opencv.util.Constant.SNAPSHOT;
import static opencv.util.Constant.TARGET_DIR;

public class PictureEvent {

    public static Point findImage(String fileName) {
        Mat src = getMatFromFile(SNAPSHOT);
        Mat target = getMatFromFile(TARGET_DIR + fileName);
        Pattern pattern = matchTemplate(src, target);

        if (pattern.getSimilar() > 0.95) {
            return pattern.getPoint();
        } else {
            return null;
        }

    }

    public static Pattern matchTemplate(Mat src, Mat temp) {
        int match_method = Imgproc.TM_SQDIFF_NORMED;

        Mat result = new Mat(src.rows(), src.cols(), CvType.CV_32FC1);
        Imgproc.matchTemplate(src, temp, result, match_method);
        Core.MinMaxLocResult mmr = Core.minMaxLoc(result);

        return new Pattern(mmr.minVal, mmr.minLoc);
    }

    public static Mat getMatFromFile(String filePath) {
        return Imgcodecs.imread(filePath);
    }

    public static class Pattern {

        double similar;

        public Pattern(double similar, Point point) {
            this.similar = similar;
            this.point = point;
        }

        Point point;

        public Point getPoint() {
            return point;
        }
        public double getSimilar() {
            return 1.0 - similar;
        }
    }

}
