package org.batch;

import adb.AdbLib;
import opencv.util.LibUtil;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.ApplicationContext;

@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class BatchApplication {

    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(BatchApplication.class, args);
        LibUtil libUtil = new LibUtil();
        libUtil.loadOpenCVLib();
        libUtil = null;

        AdbLib adbLib = new AdbLib();
        adbLib.loadLib();
        adbLib = null;

        try {
            context.getBean(Main.class).execute();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
