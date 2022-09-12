package org.batch;

import adb.Adb;
import adb.AdbKeyCode;
import opencv.util.PictureEvent;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.springframework.stereotype.Component;
import script.CustomServer;

import java.util.List;

import static script.CustomServer.*;


@Component
public class Main {


    public void execute() throws Exception {
         List<String> devices = CustomServer.getDevices();

        for (String device : devices) {
//            // just send adb command
//            System.out.println(exec("adb shell input keyevent 3"));
//
//            // sleep seconds
//            sleep(1);
//            // find location targetImage from device screen
//            Point point = findImage("line.png", device);
//            System.out.println("point = " + point);
//            // click location
//            System.out.println(click(point.x, point.y, device));
//
//            // use keyEvent send keyCode
//            sleep(1);
//            keyEvent(AdbKeyCode.KEYCODE_HOME, device);
//            sleep(1);
//
//            // find and click image from device screen
//            clickImg("chrome.png", device);
//
//
//            // swipe without duration
//            System.out.println(swipe(483, 1230, 483, 100, device));
//            // swipe with duration(ms)
//            System.out.println(swipe(483, 1230, 483, 100, 1000, device));
//            // drag without duration default 1000ms
//            System.out.println(drag(483, 1230, 483, 100, device));
//            // drag with duration(ms)
//            System.out.println(drag(483, 1230, 483, 100, 5000, device));
//
//            // drag with target image without duration default 1000ms
//            drag("chrome.png", "mapApp.png", device);
//            // drag with target image with duration(ms)
//            drag("chrome.png", "mapApp.png",5000, device);
//
//            // take snapshot from device save to file
//            takeSnapShot("test.jpg", device);
//
//            // get device app list
//            System.out.println(getAppList(device));
            // close app
//            stopApp("com.android.chrome", device);
            // start app
            // *** only can work on android version over 7.0 ***
            startApp("com.android.chrome", device);
            // clean the app by package-name all data care to use
            cleanAppData("com.example.package", device);

        }

    }


}
