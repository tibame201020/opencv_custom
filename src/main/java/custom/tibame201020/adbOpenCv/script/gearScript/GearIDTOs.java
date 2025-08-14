package custom.tibame201020.adbOpenCv.script.gearScript;

public interface GearIDTOs {

    record GearRegion(
            int x,
            int y,
            int width,
            int height
    ) {
    }

    record GearOcr(
            String ocrTemplatesPath,
            GearRegion gearRegion,
            double threshold
    ) {
    }

}
