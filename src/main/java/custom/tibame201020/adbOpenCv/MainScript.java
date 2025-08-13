package custom.tibame201020.adbOpenCv;

import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    OpenCvService openCvService = new OpenCvService();

    public void execute() {
//        System.err.println("exec");
//
//        var screenPic = "img/screen.png";
//        var targetPic = "img/target.png";
//
//        Mat src = openCvService.getMatFromFile(screenPic);
//        Mat target = openCvService.getMatFromFile(targetPic);
//        OpenCvDTOs.MatchPattern pattern = openCvService.findMatch(src, target);
//
//        if (pattern.getSimilar() > 0.99) {
//            System.err.printf("x: %s, y:%s", pattern.point().x, pattern.point().y);
//        } else {
//            System.err.println("not found");
//        }

        var testOcr = "img/gear/gear3.png";
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



        openCvService.ocrNumber(
                openCvService.getMatFromFile(testOcr)
                , new OpenCvService.OcrRegion(1180, 469, 1222, 498));
    }

}
