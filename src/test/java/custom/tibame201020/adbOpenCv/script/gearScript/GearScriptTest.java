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
        var testOcr = "img/gear/gear1.png";
        var title = "gear1";

        
        var expect = new GearDTOs.GearProp(
                17, // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                6,  // criticalRate
                15, // criticalDamage
                17, // speed
                0,  // effectResist
                0,  // effectiveness
                103, // score
                GearDTOs.GearMainProp.ATK_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear2() throws Exception {
        var testOcr = "img/gear/gear2.png";
        var title = "gear2";

        var expect = new GearDTOs.GearProp(
                9,  // attackPercent
                0,  // flatAttack
                31, // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                11, // criticalRate
                0,  // criticalDamage
                8,  // speed
                0,  // effectResist
                0,  // effectiveness
                99, // score
                GearDTOs.GearMainProp.LIFE_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear3() throws Exception {
        var testOcr = "img/gear/gear3.png";
        var title = "gear3";

        var expect = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                23, // lifePercent
                0,  // flatLife
                25, // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                8,  // speed
                0,  // effectResist
                8,  // effectiveness
                98, // score
                GearDTOs.GearMainProp.DEF_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear4() throws Exception {
        var testOcr = "img/gear/gear4.png";
        var title = "gear4";

        var expect = new GearDTOs.GearProp(
                8,  // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                7,  // criticalDamage
                0,  // speed
                0,  // effectResist
                8,  // effectiveness
                28, // score
                GearDTOs.GearMainProp.ATK_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear5() throws Exception {
        var testOcr = "img/gear/gear5.png";
        var title = "gear5";

        var expect = new GearDTOs.GearProp(
                8,  // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                4,  // criticalRate
                6,  // criticalDamage
                0,  // speed
                0,  // effectResist
                0,  // effectiveness
                32, // score
                GearDTOs.GearMainProp.SPEED
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear6() throws Exception {
        var testOcr = "img/gear/gear6.png";
        var title = "gear6";

        var expect = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                16, // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                16, // criticalRate
                13, // criticalDamage
                8,  // speed
                0,  // effectResist
                0,  // effectiveness
                98, // score
                GearDTOs.GearMainProp.DEF_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear7() throws Exception {
        var testOcr = "img/gear/gear7.png";
        var title = "gear7";

        var expect = new GearDTOs.GearProp(
                0,    // attackPercent
                0,    // flatAttack
                0,    // lifePercent
                542,  // flatLife
                0,    // defensePercent
                0,    // flatDefense
                0,    // criticalRate
                23,   // criticalDamage
                4,    // speed
                0,    // effectResist
                6,    // effectiveness
                76,   // score
                GearDTOs.GearMainProp.DEF_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear8() throws Exception {
        var testOcr = "img/gear/gear8.png";
        var title = "gear8";

        var expect = new GearDTOs.GearProp(
                9,  // attackPercent
                44, // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                7,  // speed
                0,  // effectResist
                25, // effectiveness
                76, // score
                GearDTOs.GearMainProp.DEF_PERCENT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear9() throws Exception {
        var testOcr = "img/gear/gear9.png";
        var title = "gear9";

        var expect = new GearDTOs.GearProp(
                0,   // attackPercent
                155, // flatAttack
                0,   // lifePercent
                390, // flatLife
                0,   // defensePercent
                0,   // flatDefense
                0,   // criticalRate
                4,   // criticalDamage
                7,   // speed
                0,   // effectResist
                0,   // effectiveness
                65,  // score
                GearDTOs.GearMainProp.ATK_PERCENT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear10() throws Exception {
        var testOcr = "img/gear/gear10.png";
        var title = "gear10";

        var expect = new GearDTOs.GearProp(
                0,  // attackPercent
                0,  // flatAttack
                6,  // lifePercent
                0,  // flatLife
                8,  // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                4,  // speed
                0,  // effectResist
                0,  // effectiveness
                34, // score
                GearDTOs.GearMainProp.DEF_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear11() throws Exception {
        var testOcr = "img/gear/gear11.png";
        var title = "gear11";

        var expect = new GearDTOs.GearProp(
                6,  // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                5,  // criticalRate
                0,  // criticalDamage
                3,  // speed
                0,  // effectResist
                8,  // effectiveness
                32, // score
                GearDTOs.GearMainProp.ATK_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear12() throws Exception {
        var testOcr = "img/gear/gear12.png";
        var title = "gear12";

        var expect = new GearDTOs.GearProp(
                16, // attackPercent
                0,  // flatAttack
                26, // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                6,  // criticalRate
                21, // criticalDamage
                0,  // speed
                0,  // effectResist
                0,  // effectiveness
                102, // score
                GearDTOs.GearMainProp.SPEED
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear13() throws Exception {
        var testOcr = "img/gear/gear13.png";
        var title = "gear13";

        var expect = new GearDTOs.GearProp(
                17, // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                0,  // defensePercent
                0,  // flatDefense
                11, // criticalRate
                16, // criticalDamage
                9,  // speed
                0,  // effectResist
                0,  // effectiveness
                97, // score
                GearDTOs.GearMainProp.LIFE_FLAT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear14() throws Exception {
        var testOcr = "img/gear/gear14.png";
        var title = "gear14";

        var expect = new GearDTOs.GearProp(
                21, // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                16, // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                11, // speed
                0,  // effectResist
                8,  // effectiveness
                93, // score
                GearDTOs.GearMainProp.LIFE_PERCENT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }

    @Test
    void detectGear_gear15() throws Exception {
        var testOcr = "img/gear/gear15.png";
        var title = "gear15";

        var expect = new GearDTOs.GearProp(
                21, // attackPercent
                0,  // flatAttack
                0,  // lifePercent
                0,  // flatLife
                16, // defensePercent
                0,  // flatDefense
                0,  // criticalRate
                0,  // criticalDamage
                11, // speed
                0,  // effectResist
                8,  // effectiveness
                93, // score
                GearDTOs.GearMainProp.LIFE_PERCENT
        );

        var result = gearScript.detectGear(testOcr, title);

        assertThat(result)
                .isEqualTo(expect);
    }
}
