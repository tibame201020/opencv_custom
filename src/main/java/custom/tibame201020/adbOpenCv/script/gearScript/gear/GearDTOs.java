package custom.tibame201020.adbOpenCv.script.gearScript.gear;

public class GearDTOs {

    /**
     * gear wrapper
     *
     * @param metadata gear metadata
     * @param prop     gear prop
     */
    public record Gear(
            GearMetadata metadata,
            GearProp prop
    ) {
        public double highestScore() {
            var weightedScore = switch (metadata.level) {
                case 6 -> prop.calcScore() + 24;
                case 9 -> prop.calcScore() + 16;
                case 12 -> prop.calcScore() + 8;
                case 15 -> prop.calcScore() + 0;
                default -> throw new RuntimeException("not valid level: " + metadata.level);
            };

            return weightedScore * 1.2 + 27;
        }
    }

    /**
     * gear main prop enum
     */
    public enum GearMainProp {
        ATK_PERCENT,
        LIFE_PERCENT,
        DEF_PERCENT,
        CRI_RATE,
        CRI_DMG,
        SPEED,
        EFFECT_RESISTANCE,
        EFFECT_HIT,
        ATK_FLAT,
        LIFE_FLAT,
        DEF_FLAT
    }

    /**
     * 裝備屬性 (Gear Props)
     */
    public record GearProp(
            // 攻擊%
            int attackPercent,
            // 攻擊白值
            int flatAttack,
            // 生命%
            int lifePercent,
            // 生命白值
            int flatLife,
            // 防禦%
            int defensePercent,
            // 防禦白值
            int flatDefense,
            // 暴擊%
            int criticalRate,
            // 暴擊傷害
            int criticalDamage,
            // 速度
            int speed,
            // 效果抵抗
            int effectResist,
            // 效果命中
            int effectiveness
    ) {
        public double calcScore() {
            return attackPercent + defensePercent + lifePercent + effectiveness + effectResist + speed * 2 + criticalRate * 1.5 + criticalDamage * 1.125;
        }
    }

    /**
     * gear metadata
     *
     * @param set      gear set
     * @param rarity   gear rarity
     * @param type     gear type
     * @param level    gear level
     * @param mainProp main prop
     * @param score    score
     */
    public record GearMetadata(
            GearSet set,
            GearRarity rarity,
            GearType type,
            int level,
            GearMainProp mainProp,
            int score
    ) {
    }

    /**
     * 套裝效果 (Set Effects)
     */
    public enum GearSet {
        /**
         * 攻擊 [4]
         */
        ATTACK,
        DESTRUCTION,    // 破滅 [4]
        DEFENSE,        // 防禦 [2]
        HEALTH,         // 生命 [2]
        HIT,            // 命中 [2]
        RESISTANCE,     // 抵抗 [2]
        CRITICAL,       // 暴擊 [2]
        SPEED,          // 速度 [4]
        REVENGE,        // 復仇 [4]
        LIFE_STEAL,     // 吸血 [4]
        COUNTER,        // 反擊 [4]
        DUAL_ATTACK,    // 夾攻 [2]
        IMMUNITY,       // 免疫 [2]
        RAGE,           // 憤怒 [4]
        PENETRATION,    // 貫穿 [2]
        INJURY,         // 傷口 [4]
        PROTECTION,     // 守護 [4]
        TORRENT         // 激流 [2]
    }

    /**
     * gear set type enum
     */
    public enum GearSetType {
        FOUR,
        TWO
    }

    /**
     * gear type enum
     */
    public enum GearType {
        WEAPON, HELMET, ARMOR, NECKLACE, RING, SHOES
    }

    /**
     * gear rarity enum
     */
    public enum GearRarity {
        LEGEND, HERO, OTHER
    }

    /**
     * gear belong role type
     */
    public enum GearPropBelong {
        DAMAGE {
            @Override
            public boolean isGearPropBelong(GearProp gearProp) {
                int validProps = 0;

                if (gearProp.attackPercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.criticalRate() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.criticalDamage() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.speed() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.flatAttack() > 0) {
                    validProps = validProps + 1;
                }

                return validProps >= 3;
            }
        },
        TANK_DAMAGE {
            @Override
            public boolean isGearPropBelong(GearProp gearProp) {
                int validProps = 0;

                if (gearProp.attackPercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.criticalRate() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.criticalDamage() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.speed() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.lifePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.flatLife() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.defensePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.flatDefense() > 0) {
                    validProps = validProps + 1;
                }

                return validProps >= 3;
            }
        },
        TANK {
            @Override
            public boolean isGearPropBelong(GearProp gearProp) {
                int validProps = 0;

                if (gearProp.speed() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.lifePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.flatLife() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.defensePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.flatDefense() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.effectiveness() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.effectResist() > 0) {
                    validProps = validProps + 1;
                }

                return validProps >= 3;
            }
        },
        SUPPORT {
            @Override
            public boolean isGearPropBelong(GearProp gearProp) {
                int validProps = 0;

                if (gearProp.speed() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.lifePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.defensePercent() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.effectiveness() > 0) {
                    validProps = validProps + 1;
                }
                if (gearProp.effectResist() > 0) {
                    validProps = validProps + 1;
                }

                return validProps >= 3;
            }
        };

        public abstract boolean isGearPropBelong(GearProp gearProp);
    }

    public enum GearAction {
        /**
         * 強化
         */
        UPGRADE,
        /**
         * sell
         */
        SELL,
        /**
         * 翠取
         */
        EXTRACTION;
    }

}
