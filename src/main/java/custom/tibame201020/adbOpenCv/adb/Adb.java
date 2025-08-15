package custom.tibame201020.adbOpenCv.adb;

import io.micrometer.common.util.StringUtils;
import org.apache.commons.io.IOUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * process wrapper
 */
@Service
@Lazy
public class Adb {

    /**
     * execute adb command
     *
     * @param command adb command
     * @return stdout
     */
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

    /**
     * get android snapshot by adb deviceId
     *
     * @param deviceId adb device id
     * @return snapshot byte array
     */
    public byte[] getSnapshot(String deviceId) {
        byte[] bytes;

        try {
            Process process = Runtime.getRuntime().exec(AdbCommand.SCREEN_CAP.getCommand(deviceId));
            bytes = readProcessToByteArray(process);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
        return bytes;
    }

    /**
     * read process inputStream to byte array
     *
     * @param process process
     * @return byte array
     * @throws Exception e
     */
    private byte[] readProcessToByteArray(Process process) throws Exception {
        InputStream inputStream = process.getInputStream();

        byte[] normalBytes = IOUtils.toByteArray(inputStream);
        inputStream.close();

        return normalBytes;
    }

    /**
     * read process inputStream to string
     *
     * @param process process
     * @return string
     * @throws Exception e
     */
    private String readProcess(Process process) throws Exception {
        String normalMsg = getMessageFromInputStream(process.getInputStream());

        if (StringUtils.isNotBlank(normalMsg)) {
            return normalMsg;
        } else {
            return getMessageFromInputStream(process.getErrorStream());
        }
    }

    /**
     * get string from inputStream
     *
     * @param inputStream inputStream
     * @return string
     * @throws Exception e
     */
    private String getMessageFromInputStream(InputStream inputStream) throws Exception {
        String message = IOUtils.toString(inputStream, StandardCharsets.UTF_8);
        inputStream.close();
        return message;
    }

}
