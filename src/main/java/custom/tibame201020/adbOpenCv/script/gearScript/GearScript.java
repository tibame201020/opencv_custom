package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.script.Script;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.PurpleGearUpgradeAdapter;
import custom.tibame201020.adbOpenCv.script.gearScript.gear.RedGearUpgradeAdapter;
import custom.tibame201020.adbOpenCv.service.core.opencv.MatUtility;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.service.platform.adb.AdbPlatform;
import org.opencv.core.Mat;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Lazy
public class GearScript implements Script {

    private final AdbPlatform adbPlatform;
    private final OpenCvService openCvService;
    private final PurpleGearUpgradeAdapter purpleGearUpgradeAdapter;
    private final RedGearUpgradeAdapter redGearUpgradeAdapter;
    private final Map<String, GearImageDTOs.GearOcr> ocrConfigs = new HashMap<>();

    public GearScript(AdbPlatform adbPlatform) {
        this.adbPlatform = adbPlatform;
        this.openCvService = adbPlatform.getOpenCvService();
        this.purpleGearUpgradeAdapter = new PurpleGearUpgradeAdapter();
        this.redGearUpgradeAdapter = new RedGearUpgradeAdapter();

        // Initialize OCR configurations
        // Main and Sub-properties values
        ocrConfigs.put("mainProp", new GearImageDTOs.GearOcr("images/gear/number-ocr/main-ocr", new GearImageDTOs.GearRegion(1160, 330, 70, 30), 0.8));
        ocrConfigs.put("1stProp", new GearImageDTOs.GearOcr("images/gear/number-ocr/ocr", new GearImageDTOs.GearRegion(1160, 370, 70, 25), 0.8));
        ocrConfigs.put("2ndProp", new GearImageDTOs.GearOcr("images/gear/number-ocr/ocr", new GearImageDTOs.GearRegion(1160, 390, 70, 25), 0.8));
        ocrConfigs.put("3rdProp", new GearImageDTOs.GearOcr("images/gear/number-ocr/ocr", new GearImageDTOs.GearRegion(1160, 415, 70, 25), 0.8));
        ocrConfigs.put("4thProp", new GearImageDTOs.GearOcr("images/gear/number-ocr/ocr", new GearImageDTOs.GearRegion(1160, 435, 70, 25), 0.8));
        ocrConfigs.put("score", new GearImageDTOs.GearOcr("images/gear/number-ocr/score-ocr", new GearImageDTOs.GearRegion(1160, 470, 70, 30), 0.84));

        // Gear metadata
        ocrConfigs.put("gearSet", new GearImageDTOs.GearOcr("images/gear/gear-set-ocr", new GearImageDTOs.GearRegion(900, 550, 100, 40), 0.95));
        ocrConfigs.put("gearRarity", new GearImageDTOs.GearOcr("images/gear/gear-rarity-ocr", new GearImageDTOs.GearRegion(972, 180, 35, 23), 0.85));
        ocrConfigs.put("gearType", new GearImageDTOs.GearOcr("images/gear/gear-type-ocr", new GearImageDTOs.GearRegion(1007, 180, 35, 23), 0.80));
        ocrConfigs.put("gearLevel", new GearImageDTOs.GearOcr("images/gear/gear-level-ocr", new GearImageDTOs.GearRegion(935, 168, 35, 25), 0.98));

        // Main and Sub-properties types
        ocrConfigs.put("mainPropType", new GearImageDTOs.GearOcr("images/gear/main-prop-type-ocr", new GearImageDTOs.GearRegion(880, 327, 120, 35), 0.85));
        ocrConfigs.put("1stPropType", new GearImageDTOs.GearOcr("images/gear/prop-type-ocr", new GearImageDTOs.GearRegion(875, 365, 120, 30), 0.85));
        ocrConfigs.put("2ndPropType", new GearImageDTOs.GearOcr("images/gear/prop-type-ocr", new GearImageDTOs.GearRegion(875, 389, 120, 30), 0.85));
        ocrConfigs.put("3rdPropType", new GearImageDTOs.GearOcr("images/gear/prop-type-ocr", new GearImageDTOs.GearRegion(875, 410, 120, 30), 0.85));
        ocrConfigs.put("4thPropType", new GearImageDTOs.GearOcr("images/gear/prop-type-ocr", new GearImageDTOs.GearRegion(875, 435, 120, 30), 0.85));
    }

    void upgradeGear(String deviceId, GearDTOs.Gear gear) throws Exception {
        OpenCvDTOs.OcrRegion region = new OpenCvDTOs.OcrRegion(1077, 640, 1225, 707);

        adbPlatform.clickImage("images/gear/action/upgrade-1.png", region, deviceId);
        adbPlatform.waitImage("images/gear/action/upgrade-2.png", 5000, 100, deviceId);
        adbPlatform.sleep(1);
        region = new OpenCvDTOs.OcrRegion(925, 620, 1230, 700);
        adbPlatform.clickImage("images/gear/action/upgrade-3.png", region, deviceId);

        var level = gear.metadata().level();
        var upgradeLevelOptions = List.of(3, 6, 9, 12, 15);
        var closetUpgradeLevel = upgradeLevelOptions.stream().filter(option -> option > level).min(Integer::compareTo).orElse(15);
        var upgradeOptionImage = "images/gear/action/plus-" + closetUpgradeLevel + ".png";
        region = new OpenCvDTOs.OcrRegion(950, 315, 1190, 625);
        adbPlatform.sleep(1);
        adbPlatform.clickImage(upgradeOptionImage, region, deviceId);
        adbPlatform.sleep(1);


//        adbPlatform.sleep(1);
//        adbPlatform.click(1075, 578, deviceId);
//        adbPlatform.click(1075, 520, deviceId);
//        adbPlatform.click(1075, 460, deviceId);
//        adbPlatform.click(1075, 400, deviceId);
//        adbPlatform.click(1075, 350, deviceId);
//        adbPlatform.sleep(3);

        region = new OpenCvDTOs.OcrRegion(725, 640, 810, 680);
        adbPlatform.clickImage("images/gear/action/upgrade-4.png", region, deviceId);

        adbPlatform.sleep(3);
        adbPlatform.click(640, 520, deviceId);
        adbPlatform.click(640, 520, deviceId);
        adbPlatform.click(640, 520, deviceId);

        adbPlatform.waitImage("images/gear/action/upgrade-2.png", 7000, 100, deviceId);

        region = new OpenCvDTOs.OcrRegion(0, 0, 65, 55);
        adbPlatform.clickImage("images/gear/action/upgrade-5.png", region, deviceId);
    }

    void sellGear(String deviceId) throws Exception {
        adbPlatform.click(918, 617, deviceId);
        adbPlatform.sleep(2);
        adbPlatform.click(750, 530, deviceId);
        adbPlatform.sleep(3);
    }

    void extractGear(String deviceId) throws Exception {
        adbPlatform.click(985, 620, deviceId);
        adbPlatform.sleep(2);
        adbPlatform.click(750, 530, deviceId);
        adbPlatform.sleep(3);
    }

    void storeGear(String deviceId) throws Exception {
        adbPlatform.click(1045, 620, deviceId);
        adbPlatform.sleep(2);
        adbPlatform.click(755, 455, deviceId);
        adbPlatform.sleep(3);
    }

    void gearLoop(String deviceId) throws Exception {
        System.err.println("-------------------------------");
        adbPlatform.sleep(1);
        adbPlatform.click(195, 199, deviceId);
        adbPlatform.sleep(2);
        var snapshotMat = adbPlatform.takeSnapshot(deviceId);

        var gear = detectGear(snapshotMat);
        var action = judgmentGear(gear);
        System.err.println(gear.metadata().getMetadataInfo());
        System.err.println(gear.prop().getPropInfo());
        System.err.println(action);

        switch (action) {
            case GearDTOs.GearAction.EXTRACTION -> extractGear(deviceId);
            case GearDTOs.GearAction.UPGRADE -> upgradeGear(deviceId, gear);
            case GearDTOs.GearAction.SELL -> sellGear(deviceId);
            case GearDTOs.GearAction.STORE -> storeGear(deviceId);
        }
    }

    @Override
    public void execute() throws Exception {
//        Scanner scanner = new Scanner(System.in);
//
//        var devices = adbPlatform.getDevices();
//        System.out.println("Please input device id: " + devices);
//
//        var deviceId = scanner.nextLine();

        var deviceId = "emulator-5554";

//        if (!devices.contains(deviceId)) {
//            System.err.println("Invalid device id: " + deviceId);
//            return;
//        }

        adbPlatform.connect(deviceId);

        while (true) {
            gearLoop(deviceId);
        }

    }

    GearDTOs.GearAction judgmentGear(GearDTOs.Gear gear) {
        var rarity = gear.metadata().rarity();
        var level = gear.metadata().level();

        return switch (rarity) {
            case GearDTOs.GearRarity.HERO -> {
                var result = level == 15 ? purpleGearUpgradeAdapter.isOkToStore(gear) : purpleGearUpgradeAdapter.isOkToUpgrade(gear);
                yield result ? (level == 15 ? GearDTOs.GearAction.STORE : GearDTOs.GearAction.UPGRADE) : GearDTOs.GearAction.SELL;
            }
            case GearDTOs.GearRarity.LEGEND -> {
                var result = level == 15 ? redGearUpgradeAdapter.isOkToStore(gear) : redGearUpgradeAdapter.isOkToUpgrade(gear);
                yield result ? (level == 15 ? GearDTOs.GearAction.STORE : GearDTOs.GearAction.UPGRADE) : GearDTOs.GearAction.SELL;
            }
            default -> GearDTOs.GearAction.EXTRACTION;
        };
    }

    /**
     * detect gear metadata prop from image
     *
     * @param targetGearImagePath gear image path
     * @return gear record
     * @throws Exception e
     */
    GearDTOs.Gear detectGear(String targetGearImagePath) throws Exception {
        Mat source = MatUtility.getMatFromFileWithMask(targetGearImagePath);

        return detectGear(source);
    }

    GearDTOs.Gear detectGear(Mat source) throws Exception {
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

        var metadata = convertGearMetadata(gearSetOcr, gearRarityOcr, gearTypeOcr, gearLevelOcr, mainType, main, scoreOcr);

        boolean ignoreUnknownTypes = !metadata.rarity().equals(GearDTOs.GearRarity.LEGEND);

        var prop = convertGearProp(mainType, main, _1stType, _1st, _2ndType, _2nd, _3rdType, _3rd, _4thType, _4th, ignoreUnknownTypes);

        return new GearDTOs.Gear(metadata, prop);
    }

    /**
     * convert ocr results to gear metadata
     *
     * @param gearSetOcr    gear set ocr string
     * @param gearRarityOcr gear rarity ocr string
     * @param gearTypeOcr   gear type ocr string
     * @param gearLevelOcr  gear level ocr string
     * @param mainType      gear main type ocr string
     * @param main          gear main ocr string
     * @param scoreOcr      gear score ocr string
     * @return gear metadata record
     */
    GearDTOs.GearMetadata convertGearMetadata(String gearSetOcr, String gearRarityOcr, String gearTypeOcr, String gearLevelOcr, String mainType, String main, String scoreOcr) {
        GearDTOs.GearSet gearSet = GearDTOs.GearSet.valueOf(gearSetOcr);

        gearRarityOcr = gearRarityOcr.isBlank() ? "OTHER" : gearRarityOcr;
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

    /**
     * convert ocr results to gear prop record
     *
     * @param mainType gear main type ocr string
     * @param main     gear main ocr string
     * @param _1stType gear _1st type ocr string
     * @param _1st     gear _1st ocr string
     * @param _2ndType gear _2nd type ocr string
     * @param _2nd     gear _2nd ocr string
     * @param _3rdType gear _3rd type ocr string
     * @param _3rd     gear _3rd ocr string
     * @param _4thType gear _4th type ocr string
     * @param _4th     gear _4th ocr string
     * @return gear prop record
     */
    GearDTOs.GearProp convertGearProp(String mainType, String main, String _1stType, String _1st, String _2ndType, String _2nd, String _3rdType, String _3rd, String _4thType, String _4th, boolean ignoreUnknownTypes) {
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
                            this.attackPercent = parsedValue;
                        } else {
                            this.flatAttack = parsedValue;
                        }
                        break;
                    case "life":
                        if (value.contains("%")) {
                            this.lifePercent = parsedValue;
                        } else {
                            this.flatLife = parsedValue;
                        }
                        break;
                    case "def":
                        if (value.contains("%")) {
                            this.defensePercent = parsedValue;
                        } else {
                            this.flatDefense = parsedValue;
                        }
                        break;
                    case "speed":
                        // ocr bug: 3 recognize 83
                        if (parsedValue == 83) {
                            parsedValue = 3;
                        }
                        this.speed = parsedValue;
                        break;
                    case "cri-rate":
                        this.criticalRate = parsedValue;
                        break;
                    case "cri-damage":
                        this.criticalDamage = parsedValue;
                        break;
                    case "effect-hit":
                        this.effectiveness = parsedValue;
                        break;
                    case "effect-resistance":
                        this.effectResist = parsedValue;
                        break;
                    default:
                        System.err.println("Unknown property type: " + type);
                        if (!ignoreUnknownTypes) {
                            throw new IllegalArgumentException("Unsupported property type: " + type);
                        }

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

    AtomicInteger counter = new AtomicInteger(0);
    String ocrPattern(GearImageDTOs.GearOcr gearOcr, Mat source) throws Exception {
        var result = openCvService.ocrPattern(gearOcr.ocrTemplatesPath(), source, convert2OcrRegion(gearOcr.gearRegion()), gearOcr.threshold());

        if (result.isBlank()) {
            var count = counter.incrementAndGet();
            var imageName = "unknown-" + count + ".png";

            var newRegion = new GearImageDTOs.GearRegion(
                    gearOcr.gearRegion().x() + 7,
                    gearOcr.gearRegion().y() + 2,
                    gearOcr.gearRegion().width() - 11,
                    gearOcr.gearRegion().height() - 7
            );

            var sliceRegionMat = MatUtility.sliceRegionMat(source, convert2OcrRegion(newRegion));
            MatUtility.writeToFile(imageName, sliceRegionMat);
        }

        return result;
    }

    String ocrCharacter(GearImageDTOs.GearOcr gearOcr, Mat source) throws Exception {
        return openCvService.ocrCharacter(gearOcr.ocrTemplatesPath(), source, convert2OcrRegion(gearOcr.gearRegion()), gearOcr.threshold());
    }

    OpenCvDTOs.OcrRegion convert2OcrRegion(GearImageDTOs.GearRegion gearRegion) {
        return new OpenCvDTOs.OcrRegion(
                gearRegion.x(),
                gearRegion.y(),
                gearRegion.x() + gearRegion.width(),
                gearRegion.y() + gearRegion.height()
        );
    }
}
