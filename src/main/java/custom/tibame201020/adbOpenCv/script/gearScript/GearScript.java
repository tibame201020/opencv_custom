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

//        System.err.printf("%s [ level: %s, type: %s, main: %s-%s, 1st: %s-%s, 2nd: %s-%s, 3rd: %s-%s, 4th: %s-%s, score: %s ] \n",
//                title, gearLevel, gearType, mainType, main, _1stType, _1st, _2ndType, _2nd, _3rdType, _3rd, _4thType, _4th, score);

        GearDTOs.GearMainProp gearMainProp = GearDTOs.GearMainProp.SPEED;

        if (mainType.equals("atk") && main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.ATK_PERCENT;
        }
        if (mainType.equals("atk") && !main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.ATK_FLAT;
        }
        if (mainType.equals("life") && main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.LIFE_PERCENT;
        }
        if (mainType.equals("life") && !main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.LIFE_FLAT;
        }
        if (mainType.equals("def") && main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.DEF_PERCENT;
        }
        if (mainType.equals("def") && !main.contains("%")) {
            gearMainProp = GearDTOs.GearMainProp.DEF_FLAT;
        }

        int attackPercent = 0;
        int flatAttack = 0;
        int lifePercent = 0;
        int flatLife = 0;
        int defensePercent = 0;
        int flatDefense = 0;
        int criticalRate = 0;
        int criticalDamage = 0;
        int speed = 0;
        int effectResist = 0;
        int effectiveness = 0;

        if (_1stType.equals("atk") && _1st.contains("%")) {
            attackPercent = Integer.valueOf(_1st.replace("%",""));
        }
        if (_1stType.equals("atk") && !_1st.contains("%")) {
            flatAttack = Integer.valueOf(_1st);
        }
        if (_1stType.equals("life") && _1st.contains("%")) {
            lifePercent = Integer.valueOf(_1st.replace("%",""));
        }
        if (_1stType.equals("life") && !_1st.contains("%")) {
            flatLife = Integer.valueOf(_1st);
        }
        if (_1stType.equals("def") && _1st.contains("%")) {
            defensePercent = Integer.valueOf(_1st.replace("%",""));
        }
        if (_1stType.equals("def") && !_1st.contains("%")) {
            flatDefense = Integer.valueOf(_1st);
        }
        _1st = _1st.replace("%", "");

        if (_1stType.equals("speed")) {
            speed = Integer.valueOf(_1st);
        }
        if (_1stType.equals("cri-rate")) {
            criticalRate = Integer.valueOf(_1st);
        }
        if (_1stType.equals("cri-damage")) {
            criticalDamage = Integer.valueOf(_1st);
        }
        if (_1stType.equals("effect-hit")) {
            effectiveness = Integer.valueOf(_1st);
        }
        if (_1stType.equals("ceffect-resistance")) {
            effectResist = Integer.valueOf(_1st);
        }

        // -----------
        if (_2ndType.equals("atk") && _2nd.contains("%")) {
            attackPercent = Integer.valueOf(_2nd.replace("%",""));
        }
        if (_2ndType.equals("atk") && !_2nd.contains("%")) {
            flatAttack = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("life") && _2nd.contains("%")) {
            lifePercent = Integer.valueOf(_2nd.replace("%",""));
        }
        if (_2ndType.equals("life") && !_2nd.contains("%")) {
            flatLife = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("def") && _2nd.contains("%")) {
            defensePercent = Integer.valueOf(_2nd.replace("%",""));
        }
        if (_2ndType.equals("def") && !_2nd.contains("%")) {
            flatDefense = Integer.valueOf(_2nd);
        }
        _2nd = _2nd.replace("%", "");

        if (_2ndType.equals("speed")) {
            speed = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("cri-rate")) {
            criticalRate = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("cri-damage")) {
            criticalDamage = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("effect-hit")) {
            effectiveness = Integer.valueOf(_2nd);
        }
        if (_2ndType.equals("ceffect-resistance")) {
            effectResist = Integer.valueOf(_2nd);
        }

        // -----------
        if (_3rdType.equals("atk") && _3rd.contains("%")) {
            attackPercent = Integer.valueOf(_3rd.replace("%",""));
        }
        if (_3rdType.equals("atk") && !_3rd.contains("%")) {
            flatAttack = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("life") && _3rd.contains("%")) {
            lifePercent = Integer.valueOf(_3rd.replace("%",""));
        }
        if (_3rdType.equals("life") && !_3rd.contains("%")) {
            flatLife = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("def") && _3rd.contains("%")) {
            defensePercent = Integer.valueOf(_3rd.replace("%",""));
        }
        if (_3rdType.equals("def") && !_3rd.contains("%")) {
            flatDefense = Integer.valueOf(_3rd);
        }
        _3rd = _3rd.replace("%", "");
        if (_3rdType.equals("speed")) {
            speed = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("cri-rate")) {
            criticalRate = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("cri-damage")) {
            criticalDamage = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("effect-hit")) {
            effectiveness = Integer.valueOf(_3rd);
        }
        if (_3rdType.equals("ceffect-resistance")) {
            effectResist = Integer.valueOf(_3rd);
        }

        // -----------
        if (_4thType.equals("atk") && _4th.contains("%")) {
            attackPercent = Integer.valueOf(_4th.replace("%",""));
        }
        if (_4thType.equals("atk") && !_4th.contains("%")) {
            flatAttack = Integer.valueOf(_4th);
        }
        if (_4thType.equals("life") && _4th.contains("%")) {
            lifePercent = Integer.valueOf(_4th.replace("%",""));
        }
        if (_4thType.equals("life") && !_4th.contains("%")) {
            flatLife = Integer.valueOf(_4th);
        }
        if (_4thType.equals("def") && _4th.contains("%")) {
            defensePercent = Integer.valueOf(_4th.replace("%",""));
        }
        if (_4thType.equals("def") && !_4th.contains("%")) {
            flatDefense = Integer.valueOf(_4th);
        }
        _4th = _4th.replace("%", "");
        if (_4thType.equals("speed")) {
            speed = Integer.valueOf(_4th);
        }
        if (_4thType.equals("cri-rate")) {
            criticalRate = Integer.valueOf(_4th);
        }
        if (_4thType.equals("cri-damage")) {
            criticalDamage = Integer.valueOf(_4th);
        }
        if (_4thType.equals("effect-hit")) {
            effectiveness = Integer.valueOf(_4th);
        }
        if (_4thType.equals("ceffect-resistance")) {
            effectResist = Integer.valueOf(_4th);
        }


        // todo have % that is percent props
        // GearDTOs.GearMainProp gearMainProp = new GearDTOs.GearMainProp();
        var prop = new GearDTOs.GearProp(
                attackPercent,
                flatAttack,
                lifePercent,
                flatLife,
                defensePercent,
                flatDefense,
                criticalRate,
                criticalDamage,
                speed,
                effectResist,
                effectiveness,
                Integer.valueOf(score),
                gearMainProp
        );
        System.err.println(prop);

        return prop;
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
