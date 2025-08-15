package custom.tibame201020.adbOpenCv.service.platform.adb;

/**
 * adb command wrapper
 */
public enum AdbCommand {

    /**
     * start adb daemon sever
     */
    DAEMON_START("start-server"),
    /**
     * kill adb daemon sever
     */
    DAEMON_CLOSE("kill-server"),
    /**
     * adb device list
     */
    DEVICE_LIST("devices"),
    /**
     * connect device
     */
    CONNECT("connect %s"),
    /**
     * snapshot
     */
    SCREEN_CAP("-s %s exec-out screencap -p"),
    /**
     * tap device location xy
     */
    TAP("-s %s shell input tap %s %s"),
    /**
     * swipe location xy to new xy
     */
    SWIPE("-s %s shell input swipe %s %s %s %s %s"),
    /**
     * drag location xy to new xy
     */
    DRAG_DROP("-s %s shell input draganddrop %s %s %s %s %s"),
    /**
     * start app by app package name
     */
    START_APP("-s %s shell am start -n %s"),
    /**
     * stop app by app package name
     */
    STOP_APP("-s %s shell am force-stop %s"),
    /**
     * get device app package names
     */
    GET_APPS("-s %s shell pm list packages"),
    /**
     * get active app package names
     */
    GET_ACTIVITY_BY_PACKAGE("-s %s shell cmd package resolve-activity --brief %s | tail -n 1"),
    /**
     * clean app data by app package name
     */
    CLEAN_PACKAGE_DATA("-s %s shell pm clear %s"),
    /**
     * type in words
     */
    INPUT_TEXT("-s %s shell input text %s"),
    /**
     * pull data from device
     */
    PULL_DATA("-s %s pull %s %s "),
    /**
     * push data to device
     */
    PUSH_DATA("-s %s push %s %s ");

    final String command;

    final String adbPlatform = "platform-tools\\adb.exe ";

    AdbCommand(String command) {
        this.command = command;
    }

    public String getCommand() {
        return adbPlatform + command;
    }

    public String getCommand(String deviceId) {
        return String.format(adbPlatform + command, deviceId);
    }

    public String getCommand(String deviceId, String appPackage) {
        return String.format(adbPlatform + command, deviceId, appPackage);
    }

    public String getCommand(String deviceId, int x, int y) {
        return String.format(adbPlatform + command, deviceId, x, y);
    }

    public String getCommand(String deviceId, String path1, String path2) {
        return String.format(adbPlatform + command, deviceId, path1, path2);
    }

    public String getCommand(String deviceId, int x1, int y1, int x2, int y2, int durations) {
        return String.format(adbPlatform + command, deviceId, x1, y1, x2, y2, durations);
    }
}
