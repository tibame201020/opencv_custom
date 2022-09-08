package script;

import adb.Adb;
import adb.AdbCmd;
import adb.AdbKeyCode;
import opencv.util.PictureEvent.Pattern;
import opencv.util.PictureEvent;
import org.opencv.core.Mat;
import org.opencv.core.Point;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class CustomServer {
    private static Adb adb = new Adb();

    private static PictureEvent pictureEvent = new PictureEvent();

    private static String IMG_DIR = "img/";

    public static boolean restart() {
        try {
            adb.exec(AdbCmd.DAEMON_CLOSE.getCmd());
            adb.exec(AdbCmd.DAEMON_START.getCmd());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean close() {
        try {
            adb.exec(AdbCmd.DAEMON_CLOSE.getCmd());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean start() {
        try {
            adb.exec(AdbCmd.DAEMON_START.getCmd());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static List<String> getDevices() {

        List<String> list = new ArrayList<>();

        String message = adb.exec(AdbCmd.DEVICE_LIST.getCmd());
        if (!message.startsWith("List of devices attached")) {
            return list;
        }

        getDeviceList(message, list);
        return list;
    }

    public static void getDeviceList(String message, List<String> list) {
        for (String deviceInfo : message.split("\n")) {
            if (deviceInfo.startsWith("List of devices attached")) {
                continue;
            }
            if (deviceInfo.contains("device")) {
                list.add(deviceInfo.split("\tdevice")[0]);
            }
        }
    }


    public static String click(double x, double y, String deviceId) {
        return adb.exec(AdbCmd.TAP.getCmd(deviceId, (int)x, (int)y));
    }

    public static String keyEvent(AdbKeyCode adbKeyCode, String deviceId) {
        return adb.exec(adbKeyCode.getCmd(deviceId));
    }

    public static Point findImage(String fileName, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (pattern.getSimilar() > 0.95) {
            return pattern.getPoint();
        } else {
            return null;
        }

    }

    public static void clickImg(String fileName, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (!(pattern.getSimilar() > 0.99)) {
            return;
        }

        Point point = pattern.getPoint();
        click(point.x, point.y, deviceId);
    }

    public static void sleep(int secs) throws Exception{
        TimeUnit.SECONDS.sleep(secs);
    }

    public static String exec(String command){
        command = command.replace("adb ", "platform-tools\\adb.exe ");
        return adb.exec(command);
    }
}
