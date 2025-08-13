package custom.tibame201020.adbOpenCv;

import custom.tibame201020.adbOpenCv.adb.AdbPlatform;
import custom.tibame201020.adbOpenCv.opencv.OpenCvPlatform;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AdbOpenCvApplication {

    public static void main(String[] args) {
        initialIntegrations();
        var context = SpringApplication.run(AdbOpenCvApplication.class, args);
        context.getBean(MainScript.class).execute();
    }

    static void initialIntegrations() {
        AdbPlatform adbPlatform = new AdbPlatform();
        adbPlatform.initial();

        OpenCvPlatform openCVPlatform = new OpenCvPlatform();
        openCVPlatform.initial();
    }

}
