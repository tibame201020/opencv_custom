package script;

import adb.AdbLib;
import opencv.util.LibUtil;

public class LoadLib {

    public static void loadLib() {
        LibUtil libUtil = new LibUtil();
        libUtil.loadOpenCVLib();
        libUtil = null;

        AdbLib adbLib = new AdbLib();
        adbLib.loadLib();
        adbLib = null;
    }
}
