package custom.tibame201020.adbOpenCv.opencv;

import org.opencv.core.Point;

public interface OpenCvDTOs {

    /**
     * find match result
     *
     * @param similar similar
     * @param point   find point
     */
    record MatchPattern(
            double similar,
            Point point
    ) {
        public double getSimilar() {
            return 1.0 - similar;
        }
    }

    /**
     * ocr region
     *
     * @param x1 left top x
     * @param y1 left top y
     * @param x2 right bottom x
     * @param y2 right bottom y
     */
    record OcrRegion(
            int x1,
            int y1,
            int x2,
            int y2
    ) {
    }

}
