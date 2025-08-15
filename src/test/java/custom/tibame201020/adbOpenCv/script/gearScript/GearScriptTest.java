package custom.tibame201020.adbOpenCv.script.gearScript;

import custom.tibame201020.adbOpenCv.script.gearScript.gear.GearDTOs;
import nu.pattern.OpenCV;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

class GearScriptTest {

    final GearScript gearScript = new GearScript();

    @BeforeAll
    static void initial() {
        OpenCV.loadLocally();
    }

    @Test
    void detectGear_gear1() throws Exception {
        var testOcr = "img/gear/test-mapping/gear1.png";
        var title = "gear1";

        var expectProp = new GearDTOs.GearProp(
                17, // attackPercent
                515,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                6,  // criticalRate
                15, // criticalDamage
                17, // speed
                0,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear2() throws Exception {
        var testOcr = "img/gear/test-mapping/gear2.png";
        var title = "gear2";

        var expectProp = new GearDTOs.GearProp(
                9,  // attackPercent
                0,  // flatAttack
                31, // lifePercent
                2765,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                11, // criticalRate
                0,  // criticalDamage
                8,  // speed
                0,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear3() throws Exception {
        var testOcr = "img/gear/test-mapping/gear3.png";
        var title = "gear3";

        var expectProp = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                23, // lifePercent
                0,  // flatLife
                25, // defensePercent
                310,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                8,  // speed
                0,  // effectResist
                8  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear4() throws Exception {
        var testOcr = "img/gear/test-mapping/gear4.png";
        var title = "gear4";

        var expectProp = new GearDTOs.GearProp(
                8,  // attackPercent
                100,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                7,  // criticalDamage
                0,  // speed
                0,  // effectResist
                8  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear5() throws Exception {
        var testOcr = "img/gear/test-mapping/gear5.png";
        var title = "gear5";

        var expectProp = new GearDTOs.GearProp(
                8,  // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                4,  // criticalRate
                6,  // criticalDamage
                8,  // speed
                7,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear6() throws Exception {
        var testOcr = "img/gear/test-mapping/gear6.png";
        var title = "gear6";

        var expectProp = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                16, // lifePercent
                0,  // flatLife
                0,  // defensePercent
                310,  // flatDefense
                16, // criticalRate
                13, // criticalDamage
                8,  // speed
                0,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear7() throws Exception {
        var testOcr = "img/gear/test-mapping/gear7.png";
        var title = "gear7";

        var expectProp = new GearDTOs.GearProp(
                0,    // attackPercent
                0,    // flatAttack
                0,    // lifePercent
                542,  // flatLife
                0,    // defensePercent
                300,    // flatDefense
                0,    // criticalRate
                23,   // criticalDamage
                4,    // speed
                0,    // effectResist
                6    // effectivenessT
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear8() throws Exception {
        var testOcr = "img/gear/test-mapping/gear8.png";
        var title = "gear8";

        var expectProp = new GearDTOs.GearProp(
                9,  // attackPercent
                44, // flatAttack
                0,  // lifePercent
                0,  // flatLife
                60,  // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                7,  // speed
                0,  // effectResist
                25 // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear9() throws Exception {
        var testOcr = "img/gear/test-mapping/gear9.png";
        var title = "gear9";

        var expectProp = new GearDTOs.GearProp(
                60,   // attackPercent
                155, // flatAttack
                0,   // lifePercent
                390, // flatLife
                0,   // defensePercent
                0,   // flatDefense
                0,   // criticalRate
                4,   // criticalDamage
                7,   // speed
                0,   // effectResist
                0   // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear10() throws Exception {
        var testOcr = "img/gear/test-mapping/gear10.png";
        var title = "gear10";

        var expectProp = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                6,  // lifePercent
                0,  // flatLife
                8,  // defensePercent
                60,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                4,  // speed
                7,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear11() throws Exception {
        var testOcr = "img/gear/test-mapping/gear11.png";
        var title = "gear11";

        var expectProp = new GearDTOs.GearProp(
                6,  // attackPercent
                100,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                5,  // criticalRate
                0,  // criticalDamage
                3,  // speed
                0,  // effectResist
                8  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear12() throws Exception {
        var testOcr = "img/gear/test-mapping/gear12.png";
        var title = "gear12";

        var expectProp = new GearDTOs.GearProp(
                16, // attackPercent
                0,  // flatAttack
                26, // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                6,  // criticalRate
                21, // criticalDamage
                45,  // speed
                0,  // effectResist
                0  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear13() throws Exception {
        var testOcr = "img/gear/test-mapping/gear13.png";
        var title = "gear13";

        var expectProp = new GearDTOs.GearProp(
                17, // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                2835,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                11, // criticalRate
                16, // criticalDamage
                9,  // speed
                0,  // effectResist
                0  // effectivenessT
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear14() throws Exception {
        var testOcr = "img/gear/test-mapping/gear14.png";
        var title = "gear14";

        var expectProp = new GearDTOs.GearProp(
                21, // attackPercent
                0,  // flatAttack
                65,  // lifePercent
                0,  // flatLife
                16, // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                11, // speed
                0,  // effectResist
                8  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }

    @Test
    void detectGear_gear15() throws Exception {
        var testOcr = "img/gear/test-mapping/gear15.png";
        var title = "gear15";

        var expectProp = new GearDTOs.GearProp(
                21, // attackPercent
                0,  // flatAttack
                65,  // lifePercent
                0,  // flatLife
                16, // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                11, // speed
                0,  // effectResist
                8  // effectiveness
        );

        var result = gearScript.detectGear(testOcr, title);
        var prop = result.prop();

        assertThat(prop)
                .isEqualTo(expectProp);
    }
}
