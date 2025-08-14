package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;
import nu.pattern.OpenCV;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class GearScriptTest {

    final GearScript gearScript = new GearScript();

    @BeforeAll
    static void initial() {
        OpenCV.loadLocally();
    }

    @Test
    void detectGear_gear1() throws Exception {
        var i = 1;
        var testOcr = "img/gear/gear" + i + ".png";
        var title = "gear" + i;

//        var expect = new GearDTOs.GearProp();

        var result = gearScript.detectGear(testOcr, title);

//        assertThat(result)
//                .isEqualTo(expect);
    }
}