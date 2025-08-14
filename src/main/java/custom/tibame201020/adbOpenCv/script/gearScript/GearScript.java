package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;

import java.util.HashMap;
import java.util.Map;

public class GearScript {

    OpenCvService openCvService = new OpenCvService();

    private final Map<String, GearIDTOs.GearOcr> ocrConfigs = new HashMap<>();

    public GearScript() {
        // Initialize OCR configurations
        // Main and Sub-properties values
        ocrConfigs.put("mainProp", new GearIDTOs.GearOcr("img/gear/main-ocr", new GearIDTOs.GearRegion(1160, 330, 70, 30), 0.8));
        ocrConfigs.put("1stProp", new GearIDTOs.GearOcr("img/gear/ocr", new GearIDTOs.GearRegion(1160, 370, 70, 25), 0.8));
        ocrConfigs.put("2ndProp", new GearIDTOs.GearOcr("img/gear/ocr", new GearIDTOs.GearRegion(1160, 390, 70, 25), 0.8));
        ocrConfigs.put("3rdProp", new GearIDTOs.GearOcr("img/gear/ocr", new GearIDTOs.GearRegion(1160, 415, 70, 25), 0.8));
        ocrConfigs.put("4thProp", new GearIDTOs.GearOcr("img/gear/ocr", new GearIDTOs.GearRegion(1160, 435, 70, 25), 0.8));
        ocrConfigs.put("score", new GearIDTOs.GearOcr("img/gear/score-ocr", new GearIDTOs.GearRegion(1160, 470, 70, 30), 0.85));

        // Gear metadata
        ocrConfigs.put("gearSetType", new GearIDTOs.GearOcr("img/gear/gear-set-type-ocr", new GearIDTOs.GearRegion(900, 550, 100, 40), 0.85));
        ocrConfigs.put("gearLevel", new GearIDTOs.GearOcr("img/gear/gear-level-ocr", new GearIDTOs.GearRegion(972, 180, 35, 23), 0.85));
        ocrConfigs.put("gearType", new GearIDTOs.GearOcr("img/gear/gear-type-ocr", new GearIDTOs.GearRegion(1007, 180, 35, 23), 0.85));
        ocrConfigs.put("level", new GearIDTOs.GearOcr("img/gear/level-ocr", new GearIDTOs.GearRegion(935, 167, 35, 25), 0.85));

        // Main and Sub-properties types
        ocrConfigs.put("mainPropType", new GearIDTOs.GearOcr("img/gear/main-prop-type-ocr", new GearIDTOs.GearRegion(880, 327, 120, 35), 0.85));
        ocrConfigs.put("1stPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 369, 120, 30), 0.85));
        ocrConfigs.put("2ndPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 389, 120, 30), 0.85));
        ocrConfigs.put("3rdPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 410, 120, 30), 0.85));
        ocrConfigs.put("4thPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 435, 120, 30), 0.85));
    }


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
        String gearLevel = ocrPattern(ocrConfigs.get("gearLevel"), targetImagePath);
        String gearType = ocrPattern(ocrConfigs.get("gearType"), targetImagePath);

        String mainType = ocrPattern(ocrConfigs.get("mainPropType"), targetImagePath);
        String main = ocrCharacter(ocrConfigs.get("mainProp"), targetImagePath);

        String _1stType = ocrPattern(ocrConfigs.get("1stPropType"), targetImagePath);
        String _1st = ocrCharacter(ocrConfigs.get("1stProp"), targetImagePath);

        String _2ndType = ocrPattern(ocrConfigs.get("2ndPropType"), targetImagePath);
        String _2nd = ocrCharacter(ocrConfigs.get("2ndProp"), targetImagePath);

        String _3rdType = ocrPattern(ocrConfigs.get("3rdPropType"), targetImagePath);
        String _3rd = ocrCharacter(ocrConfigs.get("3rdProp"), targetImagePath);

        String _4thType = ocrPattern(ocrConfigs.get("4thPropType"), targetImagePath);
        String _4th = ocrCharacter(ocrConfigs.get("4thProp"), targetImagePath);

        String score = ocrCharacter(ocrConfigs.get("score"), targetImagePath);

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

        class GearPropsAccumulator {
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

            void parseAndAccumulate(String type, String value) {
                int parsedValue = 0;
                String cleanedValue = value.replace("%", "");
                try {
                    parsedValue = Integer.valueOf(cleanedValue);
                } catch (NumberFormatException e) {
                    System.err.println("Error parsing number: " + cleanedValue + " for type: " + type);
                    return;
                }

                switch (type) {
                    case "atk":
                        if (value.contains("%")) {
                            this.attackPercent += parsedValue;
                        } else {
                            this.flatAttack += parsedValue;
                        }
                        break;
                    case "life":
                        if (value.contains("%")) {
                            this.lifePercent += parsedValue;
                        } else {
                            this.flatLife += parsedValue;
                        }
                        break;
                    case "def":
                        if (value.contains("%")) {
                            this.defensePercent += parsedValue;
                        } else {
                            this.flatDefense += parsedValue;
                        }
                        break;
                    case "speed":
                        this.speed += parsedValue;
                        break;
                    case "cri-rate":
                        this.criticalRate += parsedValue;
                        break;
                    case "cri-damage":
                        this.criticalDamage += parsedValue;
                        break;
                    case "effect-hit":
                        this.effectiveness += parsedValue;
                        break;
                    case "ceffect-resistance": // Assuming this was a typo and should be "effect-resistance"
                        this.effectResist += parsedValue;
                        break;
                    default:
                        System.err.println("Unknown property type: " + type);
                }
            }
        }

        GearPropsAccumulator propsAccumulator = new GearPropsAccumulator();
        propsAccumulator.parseAndAccumulate(_1stType, _1st);
        propsAccumulator.parseAndAccumulate(_2ndType, _2nd);
        propsAccumulator.parseAndAccumulate(_3rdType, _3rd);
        propsAccumulator.parseAndAccumulate(_4thType, _4th);

        var prop = new GearDTOs.GearProp(
                propsAccumulator.attackPercent,
                propsAccumulator.flatAttack,
                propsAccumulator.lifePercent,
                propsAccumulator.flatLife,
                propsAccumulator.defensePercent,
                propsAccumulator.flatDefense,
                propsAccumulator.criticalRate,
                propsAccumulator.criticalDamage,
                propsAccumulator.speed,
                propsAccumulator.effectResist,
                propsAccumulator.effectiveness,
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
