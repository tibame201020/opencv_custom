package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;

public class GearScript {

    OpenCvService openCvService = new OpenCvService();

    GearDTOs.GearRegion mainPropRegion = new GearDTOs.GearRegion(1160, 330, 70, 30);
    GearDTOs.GearRegion _1stPropRegion = new GearDTOs.GearRegion(1160, 370, 70, 25);
    GearDTOs.GearRegion _2ndPropRegion = new GearDTOs.GearRegion(1160, 390, 70, 25);
    GearDTOs.GearRegion _3rdPropRegion = new GearDTOs.GearRegion(1160, 415, 70, 25);
    GearDTOs.GearRegion _4thPropRegion = new GearDTOs.GearRegion(1160, 435, 70, 25);
    GearDTOs.GearRegion scoreRegion = new GearDTOs.GearRegion(1160, 470, 70, 30);

    String mainOcrPath = "img/gear/main-ocr";
    String propsOcrPath = "img/gear/ocr";
    String scoreOcrPath = "img/gear/score-ocr";


    GearDTOs.GearOcr mainPropOcr = new GearDTOs.GearOcr(mainOcrPath, mainPropRegion, 0.8);
    GearDTOs.GearOcr _1stPropOcr = new GearDTOs.GearOcr(propsOcrPath, _1stPropRegion, 0.8);
    GearDTOs.GearOcr _2ndPropOcr = new GearDTOs.GearOcr(propsOcrPath, _2ndPropRegion, 0.8);
    GearDTOs.GearOcr _3rdPropOcr = new GearDTOs.GearOcr(propsOcrPath, _3rdPropRegion, 0.8);
    GearDTOs.GearOcr _4thPropOcr = new GearDTOs.GearOcr(propsOcrPath, _4thPropRegion, 0.8);
    GearDTOs.GearOcr scoreOcr = new GearDTOs.GearOcr(scoreOcrPath, scoreRegion, 0.85);

    public void execute() throws Exception {
        for (int i = 1; i <= 15; i++) {
            var testOcr = "img/gear/gear" + i + ".png";
            var title = "gear" + i;

            detectGear(testOcr, title);
        }
    }

    void detectGear(String targetImagePath, String title) throws Exception {
        var main = ocrCharacter(mainPropOcr, targetImagePath);
        var _1st = ocrCharacter(_1stPropOcr, targetImagePath);
        var _2nd = ocrCharacter(_2ndPropOcr, targetImagePath);
        var _3rd = ocrCharacter(_3rdPropOcr, targetImagePath);
        var _4th = ocrCharacter(_4thPropOcr, targetImagePath);
        var score = ocrCharacter(scoreOcr, targetImagePath);

        System.err.printf("%s [ main %s, 1st: %s, 2nd: %s, 3rd: %s, 4th: %s, score: %s ]", title, main, _1st, _2nd, _3rd, _4th, score);
        System.out.println();
    }

    String ocrCharacter(GearDTOs.GearOcr gearOcr, String sourcePath) throws Exception {
        return openCvService.ocrCharacter(gearOcr.ocrTemplatesPath(), sourcePath, converToOcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    OpenCvDTOs.OcrRegion converToOcrRegion(GearDTOs.GearRegion gearRegion) {
        return new OpenCvDTOs.OcrRegion(
                gearRegion.x(),
                gearRegion.y(),
                gearRegion.x() + gearRegion.width(),
                gearRegion.y() + gearRegion.height()
        );
    }
}
