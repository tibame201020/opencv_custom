package custom.tibame201020.adbOpenCv.adb;

import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

public class AdbPlatform {

    public void initial() {
        try {
            String adb_tools_dir = "platform-tools/";
            File dir = new File(adb_tools_dir);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String[] tools = new String[]{"adb.exe", "AdbWinApi.dll", "AdbWinUsbApi.dll", "dmtracedump.exe", "etc1tool.exe", "fastboot.exe", "hprof-conv.exe", "libwinpthread-1.dll", "make_f2fs.exe", "make_f2fs_casefold.exe", "mke2fs.conf", "mke2fs.exe", "NOTICE.txt", "source.properties", "sqlite3.exe"};

            for (String tool : tools) {
                String toolName = adb_tools_dir + tool;
                copyFile(toolName);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void copyFile(String fileName) throws IOException {
        InputStream inputStream = AdbPlatform.class.getResourceAsStream("/" + fileName);
        File file = new File(fileName);

        if (!file.exists()) {
            FileUtils.copyInputStreamToFile(inputStream, file);
        }
        inputStream.close();
    }
}
