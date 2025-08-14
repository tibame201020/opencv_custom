package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.opencv.MatUtility;
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

    GearDTOs.GearRegion gearLevelRegion = new GearDTOs.GearRegion(972, 180, 35, 23);
    String gearLevelOcrPath = "img/gear/gear-level-ocr";
    GearDTOs.GearOcr gearLevelOcr = new GearDTOs.GearOcr(gearLevelOcrPath, gearLevelRegion, 0.85);


    GearDTOs.GearRegion gearTypeRegion = new GearDTOs.GearRegion(1007, 180, 35, 23);
    String gearTypeOcrPath = "img/gear/gear-type-ocr";
    GearDTOs.GearOcr gearTypeOcr = new GearDTOs.GearOcr(gearTypeOcrPath, gearTypeRegion, 0.85);

    GearDTOs.GearRegion levelRegion = new GearDTOs.GearRegion(935, 167, 35, 25);
    String levelOcrPath = "img/gear/level-ocr";
    GearDTOs.GearOcr levelOcr = new GearDTOs.GearOcr(levelOcrPath, levelRegion, 0.85);

    GearDTOs.GearRegion mainPropTypeRegion = new GearDTOs.GearRegion(880, 327, 120, 35);
    String mainPropTypeOcrPath = "img/gear/main-prop-type-ocr";
    GearDTOs.GearOcr mainPropTypeOcr = new GearDTOs.GearOcr(mainPropTypeOcrPath, mainPropTypeRegion, 0.85);

    String propTypeOcrPath = "img/gear/prop-type-ocr";
    GearDTOs.GearRegion _1stPropTypeRegion = new GearDTOs.GearRegion(875, 369, 120, 30);
    GearDTOs.GearOcr _1stPropTypeOcr = new GearDTOs.GearOcr(propTypeOcrPath, _1stPropTypeRegion, 0.85);

    GearDTOs.GearRegion _2ndtPropTypeRegion = new GearDTOs.GearRegion(875, 389, 120, 30);
    GearDTOs.GearOcr _2ndPropTypeOcr = new GearDTOs.GearOcr(propTypeOcrPath, _2ndtPropTypeRegion, 0.85);

    GearDTOs.GearRegion _3rdtPropTypeRegion = new GearDTOs.GearRegion(875, 410, 120, 30);
    GearDTOs.GearOcr _3rdPropTypeOcr = new GearDTOs.GearOcr(propTypeOcrPath, _3rdtPropTypeRegion, 0.85);

    GearDTOs.GearRegion _4thtPropTypeRegion = new GearDTOs.GearRegion(875, 435, 120, 30);
    GearDTOs.GearOcr _4thPropTypeOcr = new GearDTOs.GearOcr(propTypeOcrPath, _4thtPropTypeRegion, 0.85);



    public void execute() throws Exception {
//        for (int i = 1; i <= 15; i++) {
//            var testOcr = "img/gear/gear" + i + ".png";
//            var title = "gear" + i;
//
//            detectGear(testOcr, title);
//        }

        var testOcr = "img/gear/gear1.png";
        MatUtility.saveSliceRegionMat(testOcr, converToOcrRegion(levelOcr.gearRegion()));

    }

    void detectGear(String targetImagePath, String title) throws Exception {
        var gearLevel = ocrPattern(gearLevelOcr, targetImagePath);
        var gearType = ocrPattern(gearTypeOcr, targetImagePath);

        var mainType = ocrPattern(mainPropTypeOcr, targetImagePath);
        var main = ocrCharacter(mainPropOcr, targetImagePath);

        var _1stType = ocrPattern(_1stPropTypeOcr, targetImagePath);
        var _1st = ocrCharacter(_1stPropOcr, targetImagePath);

        var _2ndType = ocrPattern(_2ndPropTypeOcr, targetImagePath);
        var _2nd = ocrCharacter(_2ndPropOcr, targetImagePath);

        var _3rdType = ocrPattern(_3rdPropTypeOcr, targetImagePath);
        var _3rd = ocrCharacter(_3rdPropOcr, targetImagePath);

        var _4thType = ocrPattern(_4thPropTypeOcr, targetImagePath);
        var _4th = ocrCharacter(_4thPropOcr, targetImagePath);

        var score = ocrCharacter(scoreOcr, targetImagePath);

        System.err.printf("%s [ level: %s, type: %s, main: %s-%s, 1st: %s-%s, 2nd: %s-%s, 3rd: %s-%s, 4th: %s-%s, score: %s ] \n",
                title, gearLevel, gearType, mainType, main, _1stType, _1st, _2ndType, _2nd, _3rdType, _3rd, _4thType, _4th, score);
    }

    String ocrPattern(GearDTOs.GearOcr gearOcr, String sourcePath) throws Exception {
        return openCvService.ocrPattern(gearOcr.ocrTemplatesPath(), sourcePath, converToOcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
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
