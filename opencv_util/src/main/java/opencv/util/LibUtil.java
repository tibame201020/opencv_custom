package opencv.util;

import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

public class LibUtil {

    public void loadOpenCVLib() {
        String OPENCV_DDL_32 = "opencv_java460.dll";
        String DDL_DIR = "ddl/";


        InputStream inputStream = null;
        try {
            String opencv_ddl = DDL_DIR + OPENCV_DDL_32;

            inputStream = LibUtil.class.getResourceAsStream("/" + opencv_ddl);

            File opencv_lib = new File(opencv_ddl);
            if (!opencv_lib.exists()) {
                new File(DDL_DIR).mkdirs();
                FileUtils.copyInputStreamToFile(inputStream, opencv_lib);
                inputStream.close();
            }

            System.load(opencv_lib.getAbsolutePath());
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (null != inputStream) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }
        }


    }
}
