package custom.tibame201020.adbOpenCv.adb;


import custom.tibame201020.adbOpenCv.opencv.MatUtility;
import custom.tibame201020.adbOpenCv.opencv.OpenCvDTOs;
import custom.tibame201020.adbOpenCv.opencv.OpenCvService;
import io.micrometer.common.util.StringUtils;
import org.opencv.core.Mat;
import org.opencv.core.Point;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class AdbServer {

    private static final Adb adb = new Adb();
    private static final OpenCvService OPEN_CV_SERVICE = new OpenCvService();
    private static final String IMG_DIR = "img/";

    /**
     * restart adb daemon server
     *
     * @return bool status
     */
    public static boolean restart() {
        try {
            adb.exec(AdbCommand.DAEMON_CLOSE.getCommand());
            adb.exec(AdbCommand.DAEMON_START.getCommand());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * close adb daemon server
     *
     * @return bool status
     */
    public static boolean close() {
        try {
            adb.exec(AdbCommand.DAEMON_CLOSE.getCommand());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * start adb daemon server
     *
     * @return bool status
     */
    public static boolean start() {
        try {
            adb.exec(AdbCommand.DAEMON_START.getCommand());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * get device id list
     *
     * @return device id list
     */
    public static List<String> getDevices() {
        String stdout = adb.exec(AdbCommand.DEVICE_LIST.getCommand());
        if (!stdout.startsWith("List of devices attached")) {
            return List.of();
        }

        return readDeviceList(stdout);

    }

    /**
     * read device id to list, from command stdout
     *
     * @param stdout stdout
     * @return device id list
     */
    private static List<String> readDeviceList(String stdout) {
        List<String> deviceIdList = new ArrayList<>();

        for (String deviceInfo : stdout.split("\n")) {
            if (deviceInfo.startsWith("List of devices attached")) {
                continue;
            }
            if (deviceInfo.contains("device")) {
                deviceIdList.add(deviceInfo.split("\tdevice")[0]);
            }
        }

        return deviceIdList;
    }


    /**
     * click location xy on device
     *
     * @param x        location x
     * @param y        location y
     * @param deviceId device id
     * @return stdout
     */
    public static String click(double x, double y, String deviceId) {
        return adb.exec(AdbCommand.TAP.getCommand(deviceId, (int) x, (int) y));
    }

    /**
     * invoke key event by AdbKeyCode on device
     *
     * @param adbKeyCode adbKeyCode
     * @param deviceId   device id
     * @return stdout
     */
    public static String keyEvent(AdbKeyCode adbKeyCode, String deviceId) {
        return adb.exec(adbKeyCode.getCommand(deviceId));
    }

    /**
     * find image on device screen
     *
     * @param fileName image file name
     * @param deviceId device id
     * @return point
     */
    public static Point findImage(String fileName, String deviceId) {
        Mat src = MatUtility.convertBytesToMat(adb.getSnapshot(deviceId));
        Mat target = MatUtility.getMatFromFile(IMG_DIR + fileName);
        OpenCvDTOs.MatchPattern pattern = OPEN_CV_SERVICE.findMatch(src, target);

        if (pattern.getSimilar() > 0.99) {
            return pattern.point();
        } else {
            return null;
        }

    }

    /**
     * find target on device screen, with similar arg
     *
     * @param fileName image file name
     * @param similar  similar
     * @param deviceId device id
     * @return point
     */
    public static Point findImage(String fileName, double similar, String deviceId) {
        Mat src = MatUtility.convertBytesToMat(adb.getSnapshot(deviceId));
        Mat target = MatUtility.getMatFromFile(IMG_DIR + fileName);
        OpenCvDTOs.MatchPattern pattern = OPEN_CV_SERVICE.findMatch(src, target);

        if (pattern.getSimilar() > similar) {
            return pattern.point();
        } else {
            return null;
        }

    }

    /**
     * click image on device
     *
     * @param fileName image file name
     * @param deviceId device id
     * @return bool status
     */
    public static boolean clickImage(String fileName, String deviceId) {
        Mat src = MatUtility.convertBytesToMat(adb.getSnapshot(deviceId));
        Mat target = MatUtility.getMatFromFile(IMG_DIR + fileName);
        OpenCvDTOs.MatchPattern pattern = OPEN_CV_SERVICE.findMatch(src, target);

        if (!(pattern.getSimilar() > 0.99)) {
            return false;
        }

        Point point = pattern.point();
        var stdout = click(point.x, point.y, deviceId);
        return !stdout.isEmpty();
    }

    /**
     * click image on device, , with similar arg
     *
     * @param fileName image file name
     * @param similar  similar
     * @param deviceId device id
     * @return bool status
     */
    public static boolean clickImage(String fileName, double similar, String deviceId) {
        Mat src = MatUtility.convertBytesToMat(adb.getSnapshot(deviceId));
        Mat target = MatUtility.getMatFromFile(IMG_DIR + fileName);
        OpenCvDTOs.MatchPattern pattern = OPEN_CV_SERVICE.findMatch(src, target);

        if (!(pattern.getSimilar() > similar)) {
            return false;
        }

        Point point = pattern.point();
        var stdout = click(point.x, point.y, deviceId);
        return !stdout.isEmpty();
    }

    /**
     * thread sleep timeouts
     *
     * @param seconds seconds
     * @throws Exception e
     */
    public static void sleep(int seconds) throws Exception {
        TimeUnit.SECONDS.sleep(seconds);
    }

    /**
     * send adb command
     *
     * @param command command
     * @return stdout
     */
    public static String exec(String command) {
        command = command.replace("adb ", "platform-tools\\adb.exe ");
        return adb.exec(command);
    }

    /**
     * swipe location begin xy to end xy on device
     *
     * @param x1       begin x
     * @param y1       begin y
     * @param x2       end x
     * @param y2       end y
     * @param deviceId device id
     * @return stdout
     */
    public static String swipe(double x1, double y1, double x2, double y2, String deviceId) {
        String command = AdbCommand.SWIPE.getCommand(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, -9999999);
        command = command.replace("-9999999", "");
        return adb.exec(command);
    }

    /**
     * swipe location begin xy to end xy on device, with durations
     *
     * @param x1        begin x
     * @param y1        begin y
     * @param x2        end x
     * @param y2        end y
     * @param durations durations
     * @param deviceId  device id
     * @return stdout
     */
    public static String swipe(double x1, double y1, double x2, double y2, int durations, String deviceId) {
        return adb.exec(AdbCommand.SWIPE.getCommand(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, durations));
    }

    /**
     * drag location begin xy to end xy on device
     *
     * @param x1       begin x
     * @param y1       begin y
     * @param x2       end x
     * @param y2       end y
     * @param deviceId device id
     * @return stdout
     */
    public static String drag(double x1, double y1, double x2, double y2, String deviceId) {
        return adb.exec(AdbCommand.DRAG_DROP.getCommand(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, 1000));
    }

    /**
     * drag location begin xy to end xy on device, with durations
     *
     * @param x1        begin x
     * @param y1        begin y
     * @param x2        end x
     * @param y2        end y
     * @param durations durations
     * @param deviceId  device id
     * @return stdout
     */
    public static String drag(double x1, double y1, double x2, double y2, int durations, String deviceId) {
        return adb.exec(AdbCommand.DRAG_DROP.getCommand(deviceId, (int) x1, (int) y1, (int) x2, (int) y2, durations));
    }

    /**
     * drag target1 to target2
     *
     * @param target1  target1
     * @param target2  target2
     * @param deviceId device id
     * @return stdout
     */
    public static String drag(String target1, String target2, String deviceId) {
        Point point1 = findImage(target1, deviceId);
        Point point2 = findImage(target2, deviceId);
        return adb.exec(AdbCommand.DRAG_DROP.getCommand(deviceId, (int) point1.x, (int) point1.y, (int) point2.x, (int) point2.y, 1000));
    }

    /**
     * drag target1 to target2, with durations
     *
     * @param target1   target1
     * @param target2   target2
     * @param durations durations
     * @param deviceId  device id
     * @return stdout
     */
    public static String drag(String target1, String target2, int durations, String deviceId) {
        Point point1 = findImage(target1, deviceId);
        Point point2 = findImage(target2, deviceId);
        return adb.exec(AdbCommand.DRAG_DROP.getCommand(deviceId, (int) point1.x, (int) point1.y, (int) point2.x, (int) point2.y, durations));
    }

    /**
     * take snapshot on device, save to disk
     *
     * @param imageFileName save image name & path
     * @param deviceId      device id
     */
    public static void takeSnapshot(String imageFileName, String deviceId) {
        Mat mat = MatUtility.convertBytesToMat(adb.getSnapshot(deviceId));
        MatUtility.writeToFile(imageFileName, mat);
    }

    /**
     * start app use app package name on device
     *
     * @param appPackage app package name
     * @param deviceId   device id
     * @return stdout
     */
    public static String startApp(String appPackage, String deviceId) {
        String findLauncher = adb.exec(AdbCommand.GET_ACTIVITY_BY_PACKAGE.getCommand(deviceId, appPackage));

        if (StringUtils.isNotBlank(findLauncher)) {
            return adb.exec(AdbCommand.START_APP.getCommand(deviceId, findLauncher));
        }

        return null;
    }

    /**
     * stop app use app package name on device
     *
     * @param appPackage app package name
     * @param deviceId   device id
     * @return stdout
     */
    public static String stopApp(String appPackage, String deviceId) {
        return adb.exec(AdbCommand.STOP_APP.getCommand(deviceId, appPackage));
    }

    /**
     * cleanup app use app package name on device
     *
     * @param appPackage app package name
     * @param deviceId   device id
     * @return stdout
     */
    public static String cleanupAppData(String appPackage, String deviceId) {
        return adb.exec(AdbCommand.CLEAN_PACKAGE_DATA.getCommand(deviceId, appPackage));
    }

    /**
     * wait image showup then click on device
     *
     * @param fileName    image file name
     * @param millSeconds max waiting millSeconds
     * @param frequency   frequency
     * @param deviceId    device id
     * @return bool status
     * @throws Exception e
     */
    public static boolean waitClickImage(String fileName, int millSeconds, int frequency, String deviceId) throws Exception {
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

    /**
     * wait image showup on device
     *
     * @param fileName    image file name
     * @param millSeconds max waiting millSeconds
     * @param frequency   frequency
     * @param deviceId    device id
     * @return bool status
     * @throws Exception e
     */
    public static Point waitImage(String fileName, int millSeconds, int frequency, String deviceId) throws Exception {
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


    /**
     * get app list on device
     *
     * @param deviceId device id
     * @return stdout - appList
     */
    public static String getAppList(String deviceId) {
        return adb.exec(AdbCommand.GET_APPS.getCommand(deviceId));
    }

    /**
     * type words on device
     *
     * @param text     input text
     * @param deviceId device id
     * @return stdout
     */
    public static String typeText(String text, String deviceId) {
        return adb.exec(AdbCommand.INPUT_TEXT.getCommand(deviceId, text));
    }

    /**
     * connect device by device id
     *
     * @param deviceId device id
     * @return stdout
     */
    public static String connect(String deviceId) {
        return adb.exec(AdbCommand.CONNECT.getCommand(deviceId));
    }

    /**
     * pull data from device to disk
     *
     * @param androidPath android file path
     * @param diskPath    disk path
     * @param deviceId    device id
     * @return stdout
     */
    public static String pull(String androidPath, String diskPath, String deviceId) {
        return adb.exec(AdbCommand.PULL_DATA.getCommand(deviceId, androidPath, diskPath));
    }

    /**
     * push file from disk to android
     *
     * @param diskPath    disk path
     * @param androidPath android path
     * @param deviceId    device id
     * @return stdout
     */
    public static String push(String diskPath, String androidPath, String deviceId) {
        return adb.exec(AdbCommand.PUSH_DATA.getCommand(deviceId, diskPath, androidPath));
    }
}
