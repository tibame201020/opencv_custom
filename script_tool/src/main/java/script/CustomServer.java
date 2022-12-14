package script;

import adb.Adb;
import adb.AdbCmd;
import adb.AdbKeyCode;
import opencv.util.PictureEvent;
import opencv.util.PictureEvent.Pattern;
import org.apache.commons.lang.StringUtils;
import org.opencv.core.Mat;
import org.opencv.core.Point;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class CustomServer {
    private static final Adb adb = new Adb();

    private static final PictureEvent pictureEvent = new PictureEvent();

    private static final String IMG_DIR = "img/";

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

    private static void getDeviceList(String message, List<String> list) {
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
        return adb.exec(AdbCmd.TAP.getCmd(deviceId, (int) x, (int) y));
    }

    public static String keyEvent(AdbKeyCode adbKeyCode, String deviceId) {
        return adb.exec(adbKeyCode.getCmd(deviceId));
    }

    public static Point findImage(String fileName, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (pattern.getSimilar() > 0.99) {
            return pattern.getPoint();
        } else {
            return null;
        }

    }

    public static Point findImage(String fileName, double similar, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (pattern.getSimilar() > similar) {
            return pattern.getPoint();
        } else {
            return null;
        }

    }

    public static boolean clickImage(String fileName, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (!(pattern.getSimilar() > 0.99)) {
            return false;
        }

        Point point = pattern.getPoint();
        click(point.x, point.y, deviceId);

        return true;
    }

    public static boolean clickImage(String fileName,double similar, String deviceId) {
        Mat src = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        Mat target = pictureEvent.getMatFromFile(IMG_DIR + fileName);
        Pattern pattern = pictureEvent.matchTemplate(src, target);

        if (!(pattern.getSimilar() > similar)) {
            return false;
        }

        Point point = pattern.getPoint();
        click(point.x, point.y, deviceId);

        return true;
    }

    public static void sleep(int secs) throws Exception {
        TimeUnit.SECONDS.sleep(secs);
    }

    public static String exec(String command) {
        command = command.replace("adb ", "platform-tools\\adb.exe ");
        return adb.exec(command);
    }

    public static String swipe(double x1, double y1, double x2, double y2, String deviceId) {
        String command = AdbCmd.SWIPE.getCmd(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, -9999999);
        command = command.replace("-9999999", "");
        return adb.exec(command);
    }
    public static String swipe(double x1, double y1, double x2, double y2, int durations, String deviceId) {
        return adb.exec(AdbCmd.SWIPE.getCmd(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, durations));
    }

    public static String drag(double x1, double y1, double x2, double y2, String deviceId) {
        return adb.exec(AdbCmd.DRAG_DROP.getCmd(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, 1000));
    }
    public static String drag(double x1, double y1, double x2, double y2, int durations, String deviceId) {
        return adb.exec(AdbCmd.DRAG_DROP.getCmd(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, durations));
    }

    public static String drag(String target1, String target2, String deviceId) {
        Point point1 = findImage(target1, deviceId);
        Point point2 = findImage(target1, deviceId);
        return adb.exec(AdbCmd.DRAG_DROP.getCmd(deviceId, (int) point1.x, (int) point1.y, (int) point2.x, (int) point2.y, 1000));
    }

    public static String drag(String target1, String target2, int durations, String deviceId) {
        Point point1 = findImage(target1, deviceId);
        Point point2 = findImage(target1, deviceId);
        return adb.exec(AdbCmd.DRAG_DROP.getCmd(deviceId, (int) point1.x, (int) point1.y, (int) point2.x, (int) point2.y, durations));
    }

    public static void takeSnapShot(String imageFileName, String deviceId) {
        Mat mat = pictureEvent.getMatFromBytes(adb.getSnapShot(deviceId));
        pictureEvent.writeToFile(imageFileName, mat);
    }

    public static String startApp(String appPackage, String deviceId) {
        String findLauncher = adb.exec(AdbCmd.GET_ACTIVITY_BY_PACKAGE.getCmd(deviceId, appPackage));

        if (StringUtils.isNotBlank(findLauncher)) {
            return adb.exec(AdbCmd.START_APP.getCmd(deviceId, findLauncher));
        }

        return null;
    }

    public static String stopApp(String appPackage, String deviceId) {
        return adb.exec(AdbCmd.STOP_APP.getCmd(deviceId, appPackage));
    }

    public static String cleanAppData(String appPackage, String deviceId) {
        return adb.exec(AdbCmd.CLEAN_PACKAGE_DATA.getCmd(deviceId, appPackage));
    }
    public static boolean waitClickImage(String fileName, int millSeconds, int frequency, String deviceId) throws Exception{
        if (millSeconds < 0) {
            throw new RuntimeException(fileName + "not found");
        }

        Point point = findImage(fileName, deviceId);
        if (null == point) {
            millSeconds = (millSeconds - frequency);
            TimeUnit.MILLISECONDS.sleep(frequency);
            return waitClickImage(fileName, millSeconds, frequency, deviceId);
        } else {
            click(point.x, point.y, deviceId);
            return true;
        }
    }
    // default 100 ms frequency
    public static boolean waitClickImage(String fileName, int millSeconds, String deviceId) throws Exception{
        return waitClickImage(fileName, millSeconds, 100, deviceId);
    }
    // default 5 seconds
    public static boolean waitClickImage(String fileName, String deviceId) throws Exception{
        return waitClickImage(fileName, 5000, 100, deviceId);
    }

    public static Point waitImage(String fileName, int millSeconds, int frequency, String deviceId) throws Exception{
        if (millSeconds < 0) {
            throw new RuntimeException(fileName + "not found");
        }

        Point point = findImage(fileName, deviceId);
        if (null == point) {
            millSeconds = (millSeconds - frequency);
            TimeUnit.MILLISECONDS.sleep(frequency);
            return waitImage(fileName, millSeconds, frequency, deviceId);
        } else {
            return point;
        }
    }
    public static Point waitImage(String fileName, int millSeconds, String deviceId) throws Exception{
        return waitImage(fileName, millSeconds, 100, deviceId);
    }

    public static Point waitImage(String fileName, String deviceId) throws Exception{
        return waitImage(fileName, 5000, 100, deviceId);
    }



    public static String getAppList(String deviceId) {
        return adb.exec(AdbCmd.GET_APPS.getCmd(deviceId));
    }

    public static String text(String text, String deviceId) {
        return adb.exec(AdbCmd.INPUT_TEXT.getCmd(deviceId, text));
    }

    public static String connect(String deviceId) {
        return adb.exec(AdbCmd.CONNECT.getCmd(deviceId));
    }

    public static String pull(String androidPath, String pcPath , String deviceId) {
        return adb.exec(AdbCmd.PULL_DATA.getCmd(deviceId, androidPath, pcPath));
    }
    public static String push(String pcPath, String androidPath, String deviceId) {
        return adb.exec(AdbCmd.PUSH_DATA.getCmd(deviceId, pcPath, androidPath));
    }
}
