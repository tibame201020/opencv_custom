package custom.tibame201020.adbOpenCv.script.evilHunter;

import custom.tibame201020.adbOpenCv.script.Script;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvService;
import custom.tibame201020.adbOpenCv.service.platform.adb.AdbPlatform;
import org.opencv.core.Mat;

import java.time.LocalDateTime;
import java.util.Scanner;
import java.util.concurrent.atomic.AtomicInteger;

import static custom.tibame201020.adbOpenCv.script.evilHunter.EvilHunterConfig.*;

public class EvilHunterScript implements Script {
    private final AdbPlatform adbPlatform;
    private final OpenCvService openCvService;

    private boolean enableCharacterMatch = false;

    public EvilHunterScript(AdbPlatform adbPlatform) {
        this.adbPlatform = adbPlatform;
        this.openCvService = adbPlatform.getOpenCvService();
    }

    @Override
    public void execute() throws Exception {
        var deviceId = fetchDeviceId();
        adbPlatform.connect(deviceId);

        while (true) {
            loopScript(deviceId);
            adbPlatform.sleep(LOOP_INTERVAL_SECONDS);
        }
    }

    void loopScript(String deviceId) throws Exception {
        toHunterBox(deviceId);
        adbPlatform.sleep(1);
        checkHunter(deviceId);
    }

    String fetchDeviceId() {
        Scanner scanner = new Scanner(System.in);

        var devices = adbPlatform.getDevices();
        System.out.println("Please input device id: " + devices);

        var deviceId = scanner.nextLine();

        if (!devices.contains(deviceId)) {
            throw new IllegalArgumentException("Invalid device id: " + deviceId);
        }

        System.out.println("Please input enable character match: Y/N");
        var enableCharacterMatch = scanner.nextLine();
        if (!enableCharacterMatch.equalsIgnoreCase("N") || !enableCharacterMatch.equalsIgnoreCase("Y")) {
            throw new IllegalArgumentException("Invalid enable character match: " + enableCharacterMatch);
        }
        this.enableCharacterMatch = enableCharacterMatch.equalsIgnoreCase("Y");

        scanner.close();

        return deviceId;
    }

    void toHunterBox(String deviceId) throws Exception {
        adbPlatform.click(TO_SOUL_SHOP_CLICK_X, TO_SOUL_SHOP_CLICK_Y, deviceId);
        adbPlatform.sleep(1);

        adbPlatform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, deviceId);
        adbPlatform.sleep(1);

        adbPlatform.swipe(THIRD_X, 1088, THIRD_X, 500, 300, deviceId);
        adbPlatform.swipe(THIRD_X, 1088, THIRD_X, 500, 300, deviceId);
    }

    void checkHunter(String deviceId) throws Exception {
        adbPlatform.click(THIRD_X, Y_COORDINATE, deviceId);
        adbPlatform.sleep(2);

        var point = adbPlatform.findImage(PER_SECOND_DAMAGE_IMAGE_PATH, deviceId);
        if (point == null) {
            adbPlatform.click(TO_HUNTER_BOX_CLICK_X, TO_HUNTER_BOX_CLICK_Y, deviceId);
            return;
        }

        Mat snapshotMat = adbPlatform.takeSnapshot(deviceId);

        OpenCvDTOs.OcrRegion characterRegion = new OpenCvDTOs.OcrRegion(CHARACTER_REGION_X1, CHARACTER_REGION_Y1, CHARACTER_REGION_X2, CHARACTER_REGION_Y2);
        String character = openCvService.ocrPattern(CHARACTER_OCR_PATH, snapshotMat, characterRegion, CHARACTER_THRESHOLD);

        OpenCvDTOs.OcrRegion rarityRegion = new OpenCvDTOs.OcrRegion(RARITY_REGION_X1, RARITY_REGION_Y1, RARITY_REGION_X2, RARITY_REGION_Y2);

        String rarity = openCvService.ocrPattern(RARITY_OCR_PATH, snapshotMat, rarityRegion, RARITY_THRESHOLD);
        var characterMatch = TARGET_CHARACTERS.contains(character);
        var rarityMatch = TARGET_RARITIES.contains(rarity);

        characterMatch = !enableCharacterMatch || characterMatch;

        if (characterMatch && rarityMatch) {
            System.err.println("[match] Hunter: [ character:" + character + ", rarity:" + rarity + "] " + LocalDateTime.now());
            return;
        }
        System.err.println("[not match] Hunter: [ character:" + character + ", rarity:" + rarity + "] " + LocalDateTime.now());

        adbPlatform.click(360, 1100, deviceId);
        expelHunter(deviceId);
    }

    AtomicInteger counter = new AtomicInteger(0);

    void expelHunter(String deviceId) throws Exception {
        adbPlatform.click(THIRD_LOCK_X, LOCK_Y, deviceId);
        adbPlatform.sleep(1);

        adbPlatform.click(EXPEL_HUNTER_CLICK_X1, EXPEL_HUNTER_CLICK_Y1, deviceId);
        adbPlatform.sleep(1);

        adbPlatform.click(EXPEL_HUNTER_CLICK_X2, EXPEL_HUNTER_CLICK_Y2, deviceId);
        adbPlatform.click(EXPEL_HUNTER_CLICK_X3, EXPEL_HUNTER_CLICK_Y3, deviceId);
        adbPlatform.click(EXPEL_HUNTER_CLICK_X4, EXPEL_HUNTER_CLICK_Y4, deviceId);
    }

}
