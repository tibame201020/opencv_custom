package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.opencv.MatUtility;
import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;
import org.opencv.core.Mat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class GearScript {

    OpenCvService openCvService = new OpenCvService();

    private final Map<String, GearIDTOs.GearOcr> ocrConfigs = new HashMap<>();

    public GearScript() {
        // Initialize OCR configurations
        // Main and Sub-properties values
        ocrConfigs.put("mainProp", new GearIDTOs.GearOcr("img/gear/number-ocr/main-ocr", new GearIDTOs.GearRegion(1160, 330, 70, 30), 0.8));
        ocrConfigs.put("1stProp", new GearIDTOs.GearOcr("img/gear/number-ocr/ocr", new GearIDTOs.GearRegion(1160, 370, 70, 25), 0.8));
        ocrConfigs.put("2ndProp", new GearIDTOs.GearOcr("img/gear/number-ocr/ocr", new GearIDTOs.GearRegion(1160, 390, 70, 25), 0.8));
        ocrConfigs.put("3rdProp", new GearIDTOs.GearOcr("img/gear/number-ocr/ocr", new GearIDTOs.GearRegion(1160, 415, 70, 25), 0.8));
        ocrConfigs.put("4thProp", new GearIDTOs.GearOcr("img/gear/number-ocr/ocr", new GearIDTOs.GearRegion(1160, 435, 70, 25), 0.8));
        ocrConfigs.put("score", new GearIDTOs.GearOcr("img/gear/number-ocr/score-ocr", new GearIDTOs.GearRegion(1160, 470, 70, 30), 0.85));

        // Gear metadata
        ocrConfigs.put("gearSet", new GearIDTOs.GearOcr("img/gear/gear-set-ocr", new GearIDTOs.GearRegion(900, 550, 100, 40), 0.95));
        ocrConfigs.put("gearRarity", new GearIDTOs.GearOcr("img/gear/gear-rarity-ocr", new GearIDTOs.GearRegion(972, 180, 35, 23), 0.85));
        ocrConfigs.put("gearType", new GearIDTOs.GearOcr("img/gear/gear-type-ocr", new GearIDTOs.GearRegion(1007, 180, 35, 23), 0.85));
        ocrConfigs.put("gearLevel", new GearIDTOs.GearOcr("img/gear/gear-level-ocr", new GearIDTOs.GearRegion(935, 167, 35, 25), 0.99));

        // Main and Sub-properties types
        ocrConfigs.put("mainPropType", new GearIDTOs.GearOcr("img/gear/main-prop-type-ocr", new GearIDTOs.GearRegion(880, 327, 120, 35), 0.85));
        ocrConfigs.put("1stPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 369, 120, 30), 0.85));
        ocrConfigs.put("2ndPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 389, 120, 30), 0.85));
        ocrConfigs.put("3rdPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 410, 120, 30), 0.85));
        ocrConfigs.put("4thPropType", new GearIDTOs.GearOcr("img/gear/prop-type-ocr", new GearIDTOs.GearRegion(875, 435, 120, 30), 0.85));
    }


    public void execute() throws Exception {

        var testPath = "img/gear/test-mapping/level";

        try (var paths = Files.walk(Path.of(testPath))) {
            paths.forEach(path -> {
                var fileFullPath = path.toAbsolutePath().toString();
                if (!fileFullPath.contains(".png")) {
                    return;
                }
                var title = path.getFileName().toString();

                try {
                   var gear = detectGear(fileFullPath, title);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
        }


//        var snapshotPath = "img/gear/snapshots";
//        try (var paths = Files.walk(Path.of(snapshotPath))) {
//            AtomicInteger i = new AtomicInteger(0);
//            paths.forEach(path -> {
//                var fileFullPath = path.toAbsolutePath().toString();
//                if (!fileFullPath.contains(".png")) {
//                    return;
//                }
//                var current = i.incrementAndGet();
//
//                MatUtility.saveSliceRegionMat(fileFullPath, convert2OcrRegion(ocrConfigs.get("gearLevel").gearRegion()), "roi-set " + current + ".png");
//            });
//        }
    }

    GearDTOs.Gear detectGear(String targetGearImagePath, String title) throws  Exception {
        Mat source = MatUtility.getMatFromFileWithMask(targetGearImagePath);

        String gearSetOcr = ocrPattern(ocrConfigs.get("gearSet"), source);
        String gearRarityOcr = ocrPattern(ocrConfigs.get("gearRarity"), source);
        String gearTypeOcr = ocrPattern(ocrConfigs.get("gearType"), source);
        String gearLevelOcr = ocrPattern(ocrConfigs.get("gearLevel"), source);
        String scoreOcr = ocrCharacter(ocrConfigs.get("score"), source);

        String mainType = ocrPattern(ocrConfigs.get("mainPropType"), source);
        String main = ocrCharacter(ocrConfigs.get("mainProp"), source);

        String _1stType = ocrPattern(ocrConfigs.get("1stPropType"), source);
        String _1st = ocrCharacter(ocrConfigs.get("1stProp"), source);

        String _2ndType = ocrPattern(ocrConfigs.get("2ndPropType"), source);
        String _2nd = ocrCharacter(ocrConfigs.get("2ndProp"), source);

        String _3rdType = ocrPattern(ocrConfigs.get("3rdPropType"), source);
        String _3rd = ocrCharacter(ocrConfigs.get("3rdProp"), source);

        String _4thType = ocrPattern(ocrConfigs.get("4thPropType"), source);
        String _4th = ocrCharacter(ocrConfigs.get("4thProp"), source);

        var metadata = detectGearMetadata(gearSetOcr, gearRarityOcr, gearTypeOcr, gearLevelOcr, mainType, main, scoreOcr);
        var prop = detectGearProp(mainType, main, _1stType, _1st, _2ndType, _2nd, _3rdType, _3rd, _4thType, _4th);

        var gear = new GearDTOs.Gear(metadata, prop);
        System.err.println(gear.metadata());
        System.err.println(gear.prop());

        return gear;
    }

    GearDTOs.GearMetadata detectGearMetadata(String gearSetOcr, String gearRarityOcr, String gearTypeOcr, String gearLevelOcr, String mainType, String main, String scoreOcr) {
        GearDTOs.GearSet gearSet = GearDTOs.GearSet.valueOf(gearSetOcr);
        GearDTOs.GearRarity gearRarity = GearDTOs.GearRarity.valueOf(gearRarityOcr);
        GearDTOs.GearType gearType = GearDTOs.GearType.valueOf(gearTypeOcr);
        gearLevelOcr = gearLevelOcr.isBlank() ? "0" : gearLevelOcr;
        int gearLevel = Integer.parseInt(gearLevelOcr);

        GearDTOs.GearMainProp gearMainProp = switch (mainType) {
            case "atk" -> main.contains("%") ? GearDTOs.GearMainProp.ATK_PERCENT : GearDTOs.GearMainProp.ATK_FLAT;
            case "life" -> main.contains("%") ? GearDTOs.GearMainProp.LIFE_PERCENT : GearDTOs.GearMainProp.LIFE_FLAT;
            case "def" -> main.contains("%") ? GearDTOs.GearMainProp.DEF_PERCENT : GearDTOs.GearMainProp.DEF_FLAT;
            case "speed" -> GearDTOs.GearMainProp.SPEED;
            case "cri-rate" -> GearDTOs.GearMainProp.CRI_RATE;
            case "cri-damage" -> GearDTOs.GearMainProp.CRI_DMG;
            case "effect-hit" -> GearDTOs.GearMainProp.EFFECT_HIT;
            case "effect-resistance" -> GearDTOs.GearMainProp.EFFECT_RESISTANCE;
            default -> throw new IllegalArgumentException("Unsupported mainType: " + mainType);
        };

        return new GearDTOs.GearMetadata(gearSet, gearRarity, gearType, gearLevel, gearMainProp, Integer.parseInt(scoreOcr));
    }

    GearDTOs.GearProp detectGearProp(String mainType, String main, String _1stType, String _1st, String _2ndType, String _2nd, String _3rdType, String _3rd, String _4thType, String _4th) {
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
                String cleanedValue = value.replace("%", "").replace(",", "");
                try {
                    parsedValue = Integer.parseInt(cleanedValue);
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
                    case "effect-resistance":
                        this.effectResist += parsedValue;
                        break;
                    default:
                        System.err.println("Unknown property type: " + type);
                }
            }
        }

        GearPropsAccumulator propsAccumulator = new GearPropsAccumulator();
        propsAccumulator.parseAndAccumulate(mainType, main);
        propsAccumulator.parseAndAccumulate(_1stType, _1st);
        propsAccumulator.parseAndAccumulate(_2ndType, _2nd);
        propsAccumulator.parseAndAccumulate(_3rdType, _3rd);
        propsAccumulator.parseAndAccumulate(_4thType, _4th);

        return new GearDTOs.GearProp(
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
                propsAccumulator.effectiveness
        );
    }

    String ocrPattern(GearIDTOs.GearOcr gearOcr, Mat source) throws Exception {
        return openCvService.ocrPattern(gearOcr.ocrTemplatesPath(), source, convert2OcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    String ocrCharacter(GearIDTOs.GearOcr gearOcr, Mat source) throws Exception {
        return openCvService.ocrCharacter(gearOcr.ocrTemplatesPath(), source, convert2OcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    OpenCvDTOs.OcrRegion convert2OcrRegion(GearIDTOs.GearRegion gearRegion) {
        return new OpenCvDTOs.OcrRegion(
                gearRegion.x(),
                gearRegion.y(),
                gearRegion.x() + gearRegion.width(),
                gearRegion.y() + gearRegion.height()
        );
    }
}
