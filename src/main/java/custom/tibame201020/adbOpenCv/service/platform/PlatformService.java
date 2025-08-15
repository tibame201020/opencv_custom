package custom.tibame201020.adbOpenCv.service.platform;

import custom.tibame201020.adbOpenCv.service.core.opencv.OpenCvService;

/**
 * wrapper platform integration
 */
public interface PlatformService {

    /**
     * get opencv service instance
     *
     * @return OpenCvService
     */
    OpenCvService getOpenCvService();
}
