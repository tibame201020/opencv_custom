package opencv.util;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

public class PictureEvent {

    public Pattern matchTemplate(Mat src, Mat temp) {
        int match_method = Imgproc.TM_SQDIFF_NORMED;

        Mat result = new Mat(src.rows(), src.cols(), CvType.CV_32FC1);
        Imgproc.matchTemplate(src, temp, result, match_method);
        Core.MinMaxLocResult mmr = Core.minMaxLoc(result);

        Point point = mmr.minLoc;
        point.x = point.x + temp.cols()/2.0;
        point.y = point.y + temp.rows()/2.0;

        return new Pattern(mmr.minVal, mmr.minLoc);
    }

    public Mat getMatFromFile(String filePath) {
        return Imgcodecs.imread(filePath, Imgcodecs.IMREAD_GRAYSCALE);
    }

    public Mat getMatFromBytes(byte[] bytes) {
        return Imgcodecs.imdecode(new MatOfByte(bytes), Imgcodecs.IMREAD_GRAYSCALE);
    }

    public void writeToFile(String file, Mat mat) {
        Imgcodecs.imwrite(file, mat);
    }

    public class Pattern {

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
