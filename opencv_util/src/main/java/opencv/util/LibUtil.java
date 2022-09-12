package opencv.util;

import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

public class LibUtil {

    public void loadOpenCVLib() {
        String OPENCV_DDL_64 = "opencv_java451.dll";
        String OPENCV_DDL_32 = "opencv_java460.dll";
        String DDL_DIR = "ddl/";


        InputStream inputStream = null;
        try {
            int bitness = Integer.parseInt(System.getProperty("sun.arch.data.model"));
            String opencv_ddl;
            if (32 == bitness) {
                opencv_ddl = DDL_DIR + OPENCV_DDL_32;
            } else {
                opencv_ddl = DDL_DIR + OPENCV_DDL_64;
            }

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
