package custom.tibame201020.adbOpenCv.opencv.ocr;

import custom.tibame201020.adbOpenCv.opencv.MatUtility;
import org.opencv.core.Mat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

public interface MatchOCRAdaptor {


    /**
     * execute ocr
     *
     * @param ocrTemplatesPath ocr templates base path
     * @param targetImg        try ocr mat image
     * @param threshold        threshold
     * @return ocr result
     * @throws Exception e
     */
    String executeOCR(String ocrTemplatesPath, Mat targetImg, double threshold) throws Exception;

    /**
     * load ocr templates to map
     *
     * @param ocrTemplatesPath ocr templates base path
     * @return ocr templates map
     * @throws Exception e
     */
    default Map<String, Mat> loadTemplateMatMap(String ocrTemplatesPath) throws Exception {
        var extension = ".png";
        Map<String, Mat> templates = new LinkedHashMap<>();

        try (var ocrPaths = Files.walk(Path.of(ocrTemplatesPath))) {
            ocrPaths.forEach(path -> {
                var fullFileName = path.getFileName().toString();
                if (!fullFileName.contains(extension)) {
                    return;
                }

                var lastIndexOf = fullFileName.lastIndexOf(extension);
                var fileName = fullFileName.substring(0, lastIndexOf);

                var fileFullPath = path.toAbsolutePath().toString();
                var mat = MatUtility.getMatFromFileWithMask(fileFullPath);
                templates.put(fileName, mat);
            });
        }

        return templates;
    }
}
