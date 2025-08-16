package custom.tibame201020.adbOpenCv.script.evilHunter;

import java.util.List;

public class EvilHunterConfig {
    // Hunter Box Coordinates
    public static final double FIRST_X = 70;
    public static final double SECOND_X = 250;
    public static final double THIRD_X = 430;
    public static final double FOURTH_X = 610;
    public static final double Y_COORDINATE = 1130;

    // Target Rarity and Characters
    public static final List<String> TARGET_RARITIES = List.of("LEGENDARY");
    public static final List<String> TARGET_CHARACTERS = List.of("HERO", "DEF", "QUICK_SPEED");

    // Lock Coordinates for Expelling Hunter
    public static final double FIRST_LOCK_X = 150;
    public static final double SECOND_LOCK_X = 325;
    public static final double THIRD_LOCK_X = 507;
    public static final double FOURTH_LOCK_X = 685;
    public static final double LOCK_Y = 1130;

    // Script Interval
    public static final int LOOP_INTERVAL_SECONDS = 60 * 3;

    // Image Paths and OCR Thresholds
    public static final String PER_SECOND_DAMAGE_IMAGE_PATH = "images/evil-hunter/perSecondDamage.png";
    public static final String CHARACTER_OCR_PATH = "images/evil-hunter/character-ocr";
    public static final double CHARACTER_THRESHOLD = 0.95;
    public static final String RARITY_OCR_PATH = "images/evil-hunter/rarity-ocr";
    public static final double RARITY_THRESHOLD = 0.95;

    // OCR Region Coordinates
    public static final int CHARACTER_REGION_X1 = 155;
    public static final int CHARACTER_REGION_Y1 = 118;
    public static final int CHARACTER_REGION_X2 = 560;
    public static final int CHARACTER_REGION_Y2 = 193;

    public static final int RARITY_REGION_X1 = 110;
    public static final int RARITY_REGION_Y1 = 670;
    public static final int RARITY_REGION_X2 = 335;
    public static final int RARITY_REGION_Y2 = 720;

    // Click Coordinates

    public static final int TO_SOUL_SHOP_CLICK_X = 134;
    public static final int TO_SOUL_SHOP_CLICK_Y = 98;
    public static final int TO_HUNTER_BOX_CLICK_X = 350;
    public static final int TO_HUNTER_BOX_CLICK_Y = 1210;
    public static final int EXPEL_HUNTER_CLICK_X1 = 485;
    public static final int EXPEL_HUNTER_CLICK_Y1 = 935;
    public static final int EXPEL_HUNTER_CLICK_X2 = 333;
    public static final int EXPEL_HUNTER_CLICK_Y2 = 942;
    public static final int EXPEL_HUNTER_CLICK_X3 = 250;
    public static final int EXPEL_HUNTER_CLICK_Y3 = 750;
    public static final int EXPEL_HUNTER_CLICK_X4 = 406;
    public static final int EXPEL_HUNTER_CLICK_Y4 = 695;
}
