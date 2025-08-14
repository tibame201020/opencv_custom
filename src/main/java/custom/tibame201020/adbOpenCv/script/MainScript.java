package custom.tibame201020.adbOpenCv.script;

import custom.tibame201020.adbOpenCv.script.gearScript.GearScript;
import org.springframework.stereotype.Component;

@Component
public class MainScript {

    public void execute() throws Exception {
        GearScript gearScript = new GearScript();
        gearScript.execute();

    }

}
