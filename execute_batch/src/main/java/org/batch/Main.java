package org.batch;

import adb.AdbKeyCode;
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
            // just send adb command
            String cmd = "adb shell input keyevent 3";
            System.out.println(exec(cmd));

            // find location targetImage from device screen
            Point point = findImage("line.png", device);
            System.out.println("point = " + point);
            // click location
            System.out.println(click(point.x, point.y, device));
            // use keyEvent send keyCode
            keyEvent(AdbKeyCode.KEYCODE_HOME, device);
            //sleep seconds
            sleep(1);
            //click image from device screen
            clickImg("chrome.png", device);



        }

    }



}
