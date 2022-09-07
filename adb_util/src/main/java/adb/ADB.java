package adb;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class ADB {

    public static String exec(AdbCmd adbCmd) {
        String stdout = "default not console";
        try {
            Process process = Runtime.getRuntime().exec(adbCmd.getCmd());
            stdout = readProcess(process);
            process.destroy();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return stdout;
    }

    private static String readProcess(Process process) throws Exception {
        BufferedReader input = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder stringBuilder = new StringBuilder();
        String line;
        while ((line = input.readLine()) != null) {
            stringBuilder.append(line);
        }
        input.close();

        return stringBuilder.toString();
    }
}
