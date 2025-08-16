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
        ATK_PERCENT("攻擊百分比"),
        LIFE_PERCENT("生命百分比"),
        DEF_PERCENT("防禦百分比"),
        CRI_RATE("暴擊"),
        CRI_DMG("暴擊傷害"),
        SPEED("速度"),
        EFFECT_RESISTANCE("效果抵抗"),
        EFFECT_HIT("效果命中"),
        ATK_FLAT("攻擊白值"),
        LIFE_FLAT("生命白值"),
        DEF_FLAT("防禦白值");

        public final String text;

        GearMainProp(String text) {
            this.text = text;
        }
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

        public String getPropInfo() {
            StringBuilder sb = new StringBuilder();
            if (attackPercent > 0) {
                sb.append(String.format("攻擊: %d%%", attackPercent));
            }
            if (flatAttack > 0) {
                sb.append(String.format(", 攻擊白值: %d", flatAttack));
            }
            if (lifePercent > 0) {
                sb.append(String.format(", 生命: %d%%", lifePercent));
            }
            if (flatLife > 0) {
                sb.append(String.format(", 生命白值: %d", flatLife));
            }
            if (defensePercent > 0) {
                sb.append(String.format(", 防禦: %d%%", defensePercent));
            }
            if (flatDefense > 0) {
                sb.append(String.format(", 防禦白值: %d", flatDefense));
            }
            if (criticalRate > 0) {
                sb.append(String.format(", 暴擊: %d%%", criticalRate));
            }
            if (criticalDamage > 0) {
                sb.append(String.format(", 暴擊傷害: %d%%", criticalDamage));
            }
            if (speed > 0) {
                sb.append(String.format(", 速度: %d", speed));
            }
            if (effectResist > 0) {
                sb.append(String.format(", 效果抵抗: %d%%", effectResist));
            }
            if (effectiveness > 0) {
                sb.append(String.format(", 效果命中: %d%%", effectiveness));
            }

            if (sb.toString().startsWith(", ")) {
                sb.delete(0, 2);
            }

            return String.format("prop[%s]", sb);
        }

        public double calcScore() {
            return attackPercent + defensePercent + lifePercent + effectiveness + effectResist + speed * 2 + criticalRate * 1.5 + criticalDamage * 1.125;
        }

        public GearProp reduceMainProp(GearMainProp mainProp) {
            return switch (mainProp) {
                case ATK_PERCENT -> new GearProp(
                        0,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case LIFE_PERCENT -> new GearProp(
                        attackPercent,
                        flatAttack,
                        0,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case DEF_PERCENT -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        0,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case CRI_RATE -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        0,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case CRI_DMG -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        0,
                        speed,
                        effectResist,
                        effectiveness
                );
                case SPEED -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        0,
                        effectResist,
                        effectiveness
                );
                case EFFECT_RESISTANCE -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        0,
                        effectiveness
                );
                case EFFECT_HIT -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        0
                );
                case ATK_FLAT -> new GearProp(
                        attackPercent,
                        0,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case LIFE_FLAT -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        0,
                        defensePercent,
                        flatDefense,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                case DEF_FLAT -> new GearProp(
                        attackPercent,
                        flatAttack,
                        lifePercent,
                        flatLife,
                        defensePercent,
                        0,
                        criticalRate,
                        criticalDamage,
                        speed,
                        effectResist,
                        effectiveness
                );
                default -> throw new RuntimeException("not valid main prop: " + mainProp);
            };

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
        public String getMetadataInfo() {
            return String.format("metadata[稀有度: %s, 強化等級: %s, 評分: %s, 套裝: %s, 部位: %s, 主要屬性: %s]"
                    , rarity.text
                    , level
                    , score
                    , set.text
                    , type.text
                    , mainProp.text
            );
        }
    }

    /**
     * 套裝效果 (Set Effects)
     */
    public enum GearSet {
        ATTACK("攻擊套裝 [4]"),
        DESTRUCTION("破滅套裝 [4]"),
        DEFENSE("防禦套裝 [2]"),
        HEALTH("生命套裝 [2]"),
        HIT("命中套裝 [2]"),
        RESISTANCE("抵抗套裝 [2]"),
        CRITICAL("暴擊套裝 [2]"),
        SPEED("速度套裝 [4]"),
        REVENGE("復仇套裝 [4]"),
        LIFE_STEAL("吸血套裝 [4]"),
        COUNTER("反擊套裝 [4]"),
        DUAL_ATTACK("夾攻套裝 [2]"),
        IMMUNITY("免疫套裝 [2]"),
        RAGE("憤怒套裝 [4]"),
        PENETRATION("貫穿套裝 [2]"),
        INJURY("傷口套裝 [4]"),
        PROTECTION("守護套裝 [4]"),
        TORRENT("激流套裝 [2]");

        public final String text;

        GearSet(String text) {
            this.text = text;
        }
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
        WEAPON("武器"), HELMET("頭盔"), ARMOR("盔甲"), NECKLACE("項鍊"), RING("戒指"), SHOES("鞋子");

        public final String text;

        GearType(String text) {
            this.text = text;
        }
    }

    /**
     * gear rarity enum
     */
    public enum GearRarity {
        LEGEND("紅裝"), HERO("紫裝"), OTHER("其他");
        public final String text;

        GearRarity(String text) {
            this.text = text;
        }
    }

    /**
     * gear belong role type
     */
    public enum GearPropBelong {
        DAMAGE("打手") {
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
        TANK_DAMAGE("坦打") {
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
        TANK("坦克") {
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
        SUPPORT("輔助") {
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

        public final String text;

        GearPropBelong(String text) {
            this.text = text;
        }

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
        EXTRACTION,
        /**
         * STORE
         */
        STORE
    }

}
