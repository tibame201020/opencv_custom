package adb;

public enum AdbCmd {
    SCREEN_CAP("-s %s exec-out screencap -p"),
    DEVICE_LIST("devices"),
    CONNECT("connect"),
    DAEMON_START("start-server"),
    DAEMON_CLOSE("kill-server"),
    TAP("-s %s shell input tap %s %s")
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

    public String  getCmd(String deviceId, int x, int y) {
        return String.format(ADB_EXE + cmd, deviceId , x, y);
    }
}
