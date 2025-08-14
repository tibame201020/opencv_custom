package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;

public class GearScript {

    OpenCvService openCvService = new OpenCvService();

    GearIDTOs.GearRegion mainPropRegion = new GearIDTOs.GearRegion(1160, 330, 70, 30);
    GearIDTOs.GearRegion _1stPropRegion = new GearIDTOs.GearRegion(1160, 370, 70, 25);
    GearIDTOs.GearRegion _2ndPropRegion = new GearIDTOs.GearRegion(1160, 390, 70, 25);
    GearIDTOs.GearRegion _3rdPropRegion = new GearIDTOs.GearRegion(1160, 415, 70, 25);
    GearIDTOs.GearRegion _4thPropRegion = new GearIDTOs.GearRegion(1160, 435, 70, 25);
    GearIDTOs.GearRegion scoreRegion = new GearIDTOs.GearRegion(1160, 470, 70, 30);

    String mainOcrPath = "img/gear/main-ocr";
    String propsOcrPath = "img/gear/ocr";
    String scoreOcrPath = "img/gear/score-ocr";


    GearIDTOs.GearOcr mainPropOcr = new GearIDTOs.GearOcr(mainOcrPath, mainPropRegion, 0.8);
    GearIDTOs.GearOcr _1stPropOcr = new GearIDTOs.GearOcr(propsOcrPath, _1stPropRegion, 0.8);
    GearIDTOs.GearOcr _2ndPropOcr = new GearIDTOs.GearOcr(propsOcrPath, _2ndPropRegion, 0.8);
    GearIDTOs.GearOcr _3rdPropOcr = new GearIDTOs.GearOcr(propsOcrPath, _3rdPropRegion, 0.8);
    GearIDTOs.GearOcr _4thPropOcr = new GearIDTOs.GearOcr(propsOcrPath, _4thPropRegion, 0.8);
    GearIDTOs.GearOcr scoreOcr = new GearIDTOs.GearOcr(scoreOcrPath, scoreRegion, 0.85);

    GearIDTOs.GearRegion gearSetTypeRegion = new GearIDTOs.GearRegion(900, 550, 100, 40);
    String gearSetTypeOcrPath = "img/gear/gear-set-type-ocr";
    GearIDTOs.GearOcr gearSetTypeOcr = new GearIDTOs.GearOcr(gearSetTypeOcrPath, gearSetTypeRegion, 0.85);

    GearIDTOs.GearRegion gearLevelRegion = new GearIDTOs.GearRegion(972, 180, 35, 23);
    String gearLevelOcrPath = "img/gear/gear-level-ocr";
    GearIDTOs.GearOcr gearLevelOcr = new GearIDTOs.GearOcr(gearLevelOcrPath, gearLevelRegion, 0.85);


    GearIDTOs.GearRegion gearTypeRegion = new GearIDTOs.GearRegion(1007, 180, 35, 23);
    String gearTypeOcrPath = "img/gear/gear-type-ocr";
    GearIDTOs.GearOcr gearTypeOcr = new GearIDTOs.GearOcr(gearTypeOcrPath, gearTypeRegion, 0.85);

    GearIDTOs.GearRegion levelRegion = new GearIDTOs.GearRegion(935, 167, 35, 25);
    String levelOcrPath = "img/gear/level-ocr";
    GearIDTOs.GearOcr levelOcr = new GearIDTOs.GearOcr(levelOcrPath, levelRegion, 0.85);

    GearIDTOs.GearRegion mainPropTypeRegion = new GearIDTOs.GearRegion(880, 327, 120, 35);
    String mainPropTypeOcrPath = "img/gear/main-prop-type-ocr";
    GearIDTOs.GearOcr mainPropTypeOcr = new GearIDTOs.GearOcr(mainPropTypeOcrPath, mainPropTypeRegion, 0.85);

    String propTypeOcrPath = "img/gear/prop-type-ocr";
    GearIDTOs.GearRegion _1stPropTypeRegion = new GearIDTOs.GearRegion(875, 369, 120, 30);
    GearIDTOs.GearOcr _1stPropTypeOcr = new GearIDTOs.GearOcr(propTypeOcrPath, _1stPropTypeRegion, 0.85);

    GearIDTOs.GearRegion _2ndtPropTypeRegion = new GearIDTOs.GearRegion(875, 389, 120, 30);
    GearIDTOs.GearOcr _2ndPropTypeOcr = new GearIDTOs.GearOcr(propTypeOcrPath, _2ndtPropTypeRegion, 0.85);

    GearIDTOs.GearRegion _3rdtPropTypeRegion = new GearIDTOs.GearRegion(875, 410, 120, 30);
    GearIDTOs.GearOcr _3rdPropTypeOcr = new GearIDTOs.GearOcr(propTypeOcrPath, _3rdtPropTypeRegion, 0.85);

    GearIDTOs.GearRegion _4thtPropTypeRegion = new GearIDTOs.GearRegion(875, 435, 120, 30);
    GearIDTOs.GearOcr _4thPropTypeOcr = new GearIDTOs.GearOcr(propTypeOcrPath, _4thtPropTypeRegion, 0.85);


    public void execute() throws Exception {
        for (int i = 1; i <= 15; i++) {
            var testOcr = "img/gear/gear" + i + ".png";
            var title = "gear" + i;

            detectGear(testOcr, title);
        }


//        try (var paths = Files.walk(Path.of("img/gear/snapshots"))) {
//            AtomicInteger i = new AtomicInteger(0);
//            paths.forEach(path -> {
//                var fileFullPath = path.toAbsolutePath().toString();
//                if (!fileFullPath.contains(".png")) {
//                    return;
//                }
//                var current = i.incrementAndGet();
//
//                MatUtility.saveSliceRegionMat(fileFullPath, converToOcrRegion(levelOcr.gearRegion()), "roi-level " + current + ".png");
//                MatUtility.saveSliceRegionMat(fileFullPath, converToOcrRegion(gearSetTypeOcr.gearRegion()), "roi-set " + current + ".png");
//            });
//        }
    }

    GearDTOs.GearProp detectGear(String targetImagePath, String title) throws Exception {
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

        // todo have % that is percent props
        // GearDTOs.GearMainProp gearMainProp = new GearDTOs.GearMainProp();
        // return new GearDTOs.GearProp();

        return null;
    }

    String ocrPattern(GearIDTOs.GearOcr gearOcr, String sourcePath) throws Exception {
        return openCvService.ocrPattern(gearOcr.ocrTemplatesPath(), sourcePath, converToOcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    String ocrCharacter(GearIDTOs.GearOcr gearOcr, String sourcePath) throws Exception {
        return openCvService.ocrCharacter(gearOcr.ocrTemplatesPath(), sourcePath, converToOcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    OpenCvDTOs.OcrRegion converToOcrRegion(GearIDTOs.GearRegion gearRegion) {
        return new OpenCvDTOs.OcrRegion(
                gearRegion.x(),
                gearRegion.y(),
                gearRegion.x() + gearRegion.width(),
                gearRegion.y() + gearRegion.height()
        );
    }
}
