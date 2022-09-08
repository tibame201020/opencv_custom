package adb;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;

import java.io.InputStream;

public class Adb {

    public String exec(String command) {
        String stdout;
        try {
            Process process = Runtime.getRuntime().exec(command);
            stdout = readProcess(process);
            process.destroy();
        } catch (Exception e) {
            e.printStackTrace();
            return "something error : " + e;
        }
        return stdout;
    }

    public byte[] getSnapShot(String deviceId) {
        byte[] bytes;

        try {
            Process process = Runtime.getRuntime().exec(AdbCmd.SCREEN_CAP.getCmd(deviceId));
            bytes = readProcessToByteArray(process);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
        return bytes;
    }

    private byte[] readProcessToByteArray(Process process) throws Exception {
        InputStream inputStream = process.getInputStream();
        byte[] normalBytes = IOUtils.toByteArray(inputStream);
        inputStream.close();

        return normalBytes;
    }

    private String readProcess(Process process) throws Exception {
        String normalMsg = getMessageFromInputStream(process.getInputStream());

        if (StringUtils.isNotBlank(normalMsg)) {
            return normalMsg;
        } else {
            return getMessageFromInputStream(process.getErrorStream());
        }
    }

    private String getMessageFromInputStream(InputStream inputStream) throws Exception {
        String message = IOUtils.toString(inputStream, "UTF-8");
        inputStream.close();
        return message;
    }

}
