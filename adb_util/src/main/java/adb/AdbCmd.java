package adb;

public enum AdbCmd {
    SCREEN_CAP("platform-tools\\adb.exe shell screencap -p"),
    DEVICE_LIST("platform-tools\\adb.exe devices"),
    CONNECT("platform-tools\\adb.exe connect"),
    DAEMON_START("platform-tools\\adb.exe")

    ;


    String cmd;
    AdbCmd(String cmd) {
        this.cmd = cmd;
    }

    public String getCmd(){
        return cmd;
    }
}
