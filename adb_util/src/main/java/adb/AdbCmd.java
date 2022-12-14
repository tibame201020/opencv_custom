package adb;

public enum AdbCmd {
    CONNECT("connect %s"),
    SCREEN_CAP("-s %s exec-out screencap -p"),
    DEVICE_LIST("devices"),
    DAEMON_START("start-server"),
    DAEMON_CLOSE("kill-server"),
    TAP("-s %s shell input tap %s %s"),

    SWIPE("-s %s shell input swipe %s %s %s %s %s"),

    DRAG_DROP("-s %s shell input draganddrop %s %s %s %s %s"),

    START_APP("-s %s shell am start -n %s"),

    STOP_APP("-s %s shell am force-stop %s"),

    GET_APPS("-s %s shell pm list packages"),
    GET_ACTIVITY_BY_PACKAGE("-s %s shell cmd package resolve-activity --brief %s | tail -n 1"),

    CLEAN_PACKAGE_DATA("-s %s shell pm clear %s"),
    INPUT_TEXT("-s %s shell input text %s"),
    PULL_DATA("-s %s pull %s %s "),
    PUSH_DATA("-s %s push %s %s ")
    ;


    String cmd;

    private final String ADB_EXE = "platform-tools\\adb.exe ";

    AdbCmd(String cmd) {
        this.cmd = cmd;
    }

    public String getCmd() {
        return ADB_EXE + cmd;
    }

    public String getCmd(String deviceId) {
        return String.format(ADB_EXE + cmd, deviceId);
    }

    public String getCmd(String deviceId, String appPackage) {
        return String.format(ADB_EXE + cmd, deviceId, appPackage);
    }

    public String  getCmd(String deviceId, int x, int y) {
        return String.format(ADB_EXE + cmd, deviceId , x, y);
    }

    public String  getCmd(String deviceId, String path1, String path2) {
        return String.format(ADB_EXE + cmd, deviceId , path1, path2);
    }

    public String  getCmd(String deviceId, int x1, int y1, int x2, int y2, int durations) {
        return String.format(ADB_EXE + cmd, deviceId , x1, y1, x2, y2, durations);
    }
}
