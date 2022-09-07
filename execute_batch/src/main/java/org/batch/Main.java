package org.batch;

import adb.ADB;
import adb.AdbCmd;
import opencv.util.PictureEvent.Pattern;
import opencv.util.PictureEvent;
import org.apache.commons.io.FileUtils;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.springframework.stereotype.Component;

import java.io.*;

import static opencv.util.Constant.SNAPSHOT;
import static opencv.util.Constant.TARGET_DIR;


@Component
public class Main {


    public void execute() throws IOException {

        System.out.println(ADB.exec(AdbCmd.DEVICE_LIST));

    }


    private void test() {
        Mat src = PictureEvent.getMatFromFile(SNAPSHOT);

        Mat target = PictureEvent.getMatFromFile(TARGET_DIR + "wantToFind.PNG");

        Pattern pattern = PictureEvent.matchTemplate(src, target);

        System.out.println(pattern.getSimilar());
        System.out.println(pattern.getPoint());


        Point point = PictureEvent.findImage("wantToFind.PNG");

        System.out.println(point);

    }
}
