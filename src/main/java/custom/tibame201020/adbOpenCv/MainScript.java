package custom.tibame201020.adbOpenCv;

import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    OpenCvService openCvService = new OpenCvService();

    public void execute() {

        var testOcr = "img/gear/gear2.png";
        var zero = "img/gear/score-ocr/zero.png";
        var one = "img/gear/score-ocr/one.png";
        var two = "img/gear/score-ocr/two.png";
        var three = "img/gear/score-ocr/three.png";
        var four = "img/gear/score-ocr/four.png";
        var five = "img/gear/score-ocr/five.png";
        var six = "img/gear/score-ocr/six.png";
        var seven = "img/gear/score-ocr/seven.png";
        var eight = "img/gear/score-ocr/eight.png";
        var nine = "img/gear/score-ocr/nine.png";
        var dot = "img/gear/ocr/dot.png";
        var percent = "img/gear/ocr/percent.png";

        double threshold = 0.95;

        openCvService.ocrNumber(new OpenCvService.OcrPath(zero, one, two, three, four, five, six, seven, eight, nine, dot, percent)
                , openCvService.getMatFromFile(testOcr)
                , new OpenCvService.OcrRegion(1180, 469, 1233, 497)
                , threshold
                );
    }

}
