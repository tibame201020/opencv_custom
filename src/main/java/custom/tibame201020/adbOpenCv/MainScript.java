package custom.tibame201020.adbOpenCv;

import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    OpenCvService openCvService = new OpenCvService();

    public void execute() {

        var zero = "img/gear/ocr/zero.png";
        var one = "img/gear/ocr/one.png";
        var two = "img/gear/ocr/two.png";
        var three = "img/gear/ocr/three.png";
        var four = "img/gear/ocr/four.png";
        var five = "img/gear/ocr/five.png";
        var six = "img/gear/ocr/six.png";
        var seven = "img/gear/ocr/seven.png";
        var eight = "img/gear/ocr/eight.png";
        var nine = "img/gear/ocr/nine.png";
        var dot = "img/gear/ocr/dot.png";
        var percent = "img/gear/ocr/percent.png";

        double threshold = 0.8;

        for (int i = 1; i <=15 ; i++) {
            var testOcr = "img/gear/gear" + i + ".png";

            var result = openCvService.ocrNumber(new OpenCvService.OcrPath(zero, one, two, three, four, five, six, seven, eight, nine, dot, percent)
                    , openCvService.getMatFromFile(testOcr)
                    , new OpenCvService.OcrRegion(1159, 329, 1227, 356)
                    , threshold
            );

            System.out.println(result);
        }
    }

}
