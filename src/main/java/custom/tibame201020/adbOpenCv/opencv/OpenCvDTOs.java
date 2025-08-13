package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.Point;

public interface OpenCvDTOs {

    record MatchPattern(
            double similar,
            Point point
    ) {
        public double getSimilar() {
            return 1.0 - similar;
        }
    }

}
