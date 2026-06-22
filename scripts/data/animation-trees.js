// ============================================================
// DATA: Predicate-tagged animation candidates mined from PF2e Graphics
// (resources/extract_pf2e_animation_trees.py output, Phase K2, extended K4
// to also cover class features/creature abilities using "item:slug:X"
// keys, e.g. elemental-blast, diabolic-quill). Each slug maps to a flat
// list of { trigger, role, predicate, file } candidates, where "predicate"
// is the full accumulated predicate tree (top-level group predicate plus
// every ancestor "predicate" array) for that file. Consumed by
// resolveAnimationTreeAsset() in core/animation-tree-resolver.js, which
// evaluates each candidate's predicate via evaluatePredicate() against a
// runtime context before checking isValidSequencerPath().
// ============================================================
const PF2E_ANIMATION_TREES = {
    "acid-splash": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.fire_bolt.green"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.liquid.splash.green"
        }
    ],
    "admonishing-ray": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.ranged.02.instant.01.yellow"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.ranged.02.instant.01.purple"
        }
    ],
    "alarm": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "lte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.magic_signs.circle.02.abjuration.intro.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "settings:persistent"
            ],
            "file": "jb2a.magic_signs.circle.02.abjuration.complete.blue"
        }
    ],
    "breathe-fire": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.burning_hands.01.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.burning_hands.01.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.cone_of_cold.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "conservation-of-energy:cold",
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.cone_of_cold.blue"
        }
    ],
    "briny-bolt": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.ranged.04.projectile.01.green"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.ranged.04.projectile.01.blue"
        }
    ],
    "caustic-blast": [
        {
            "trigger": "place-template",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.fire_bolt.green"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.liquid.splash.green"
        }
    ],
    "charm": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.whirlwind.purple"
        }
    ],
    "chilling-spray": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.cone_of_cold.blue"
        }
    ],
    "command": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.template_circle.out_pulse.02.burst"
        }
    ],
    "crushing-ground": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.impact.ground_crack.02.orange"
        }
    ],
    "daze": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.fire_bolt.orange"
        },
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.fire_bolt.purple"
        }
    ],
    "detect-magic": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.detect_magic.circle"
        }
    ],
    "divine-lance": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:holy"
            ],
            "file": "jb2a.ranged.02.instant.01.yellow"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                {
                    "nor": [
                        "item:trait:holy",
                        "item:trait:unholy"
                    ]
                }
            ],
            "file": "jb2a.ranged.01.instant.01.dark_orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:unholy",
                "jb2a:patreon"
            ],
            "file": "jb2a.ranged.01.instant.01.dark_purple"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:unholy",
                "jb2a:free"
            ],
            "file": "jb2a.ranged.01.instant.01.dark_orange"
        }
    ],
    "dizzying-colors": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.breath_weapons.cold.cone.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.breath_weapons.cold.cone.green"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.breath_weapons.cold.cone.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.breath_weapons.cold.cone.purple"
        }
    ],
    "electric-arc": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.chain_lightning.primary.blue"
        }
    ],
    "enfeeble": [
        {
            "trigger": "saving-throw",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.eldritch_blast.dark_red"
        }
    ],
    "force-barrage": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.magic_missile.purple"
        }
    ],
    "frostbite": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.ray_of_frost.blue"
        }
    ],
    "gale-blast": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.whirlwind.bluegrey"
        }
    ],
    "gouging-claw": [
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                "item:damage:type:piercing"
            ],
            "file": "jb2a.melee_generic.piercing.one_handed"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                "item:damage:type:slashing"
            ],
            "file": "jb2a.melee_generic.slashing.one_handed"
        }
    ],
    "grim-tendrils": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.energy_strands.range.multiple.purple.01"
        }
    ],
    "haunting-hymn": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.side_impact.part.shockwave.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.side_impact.part.slow.music_note.pink"
        }
    ],
    "heal": [
        {
            "trigger": "damage-taken",
            "role": "projectile",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        1
                    ]
                },
                "jb2a:patreon"
            ],
            "file": "jb2a.bullet.01.green"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.healing_generic.400px.green"
        }
    ],
    "ignition": [
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.cast_generic.fire.side01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.fire_bolt.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.spell_projectile.ice_shard.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.impact.fire.01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "graphics-sfx.magic.ice.ranged.strike.impact.snowball.01"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.side_impact.ice_shard.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "jb2a:patreon"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "jb2a:free"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.blue"
        }
    ],
    "imaginary-weapon": [
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.melee_attack.02.trail.01.blueyellow"
        }
    ],
    "kinetic-ram": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.melee_generic.bludgeoning.two_handed"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.explosion.04.dark_purple"
        }
    ],
    "lay-on-hands": [
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.cure_wounds.400px.blue"
        }
    ],
    "lose-the-path": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.magic_signs.rune.illusion.complete.purple"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.magic_signs.rune.illusion.complete.green"
        }
    ],
    "mushroom-patch": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.plant_growth.03.round.4x4.complete.greenyellow"
        }
    ],
    "needle-darts": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.bolt.physical.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.bolt.physical.white"
        }
    ],
    "phase-bolt": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.bolt.physical.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.bolt.physical.purple"
        }
    ],
    "puff-of-poison": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.smoke.puff.side.green"
        },
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.smoke.puff.side.grey"
        }
    ],
    "ray-of-frost": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.ray_of_frost.blue"
        }
    ],
    "scatter-scree": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.falling_rocks.side.2x1.grey"
        }
    ],
    "schadenfreude": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.icon.stun.purple"
        }
    ],
    "soothe": [
        {
            "trigger": "damage-taken",
            "role": "projectile",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        1
                    ]
                },
                "jb2a:patreon"
            ],
            "file": "jb2a.energy_strands.range.standard.dark_green"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.healing_generic.400px.green"
        }
    ],
    "spout": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.water_splash.circle.01.blue"
        }
    ],
    "telekinetic-projectile": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free",
                "item:damage:bludgeoning"
            ],
            "file": "jb2a.boulder.toss.02.01.stone.brown"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:free",
                "item:damage:piercing"
            ],
            "file": "jb2a.template_line_piercing.generic.01.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:free",
                "item:damage:slashing"
            ],
            "file": "jb2a.melee_generic.slash.01.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon",
                "item:damage:bludgeoning"
            ],
            "file": "jb2a.slingshot"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon",
                "item:damage:piercing"
            ],
            "file": "jb2a.dart.01.throw.physical.white"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                "item:damage:slashing"
            ],
            "file": "jb2a.melee_generic.slashing"
        }
    ],
    "telekinetic-rend": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "or": [
                        "origin:item:damage:bludgeoning",
                        {
                            "and": [
                                "origin:item:tag:amped",
                                {
                                    "gte": [
                                        "settings:quality",
                                        2
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "file": "jb2a.falling_rocks.top.1x1.grey"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "or": [
                        "origin:item:damage:slashing",
                        {
                            "and": [
                                "origin:item:tag:amped",
                                {
                                    "gte": [
                                        "settings:quality",
                                        2
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "file": "jb2a.whirlwind.bluegrey"
        }
    ],
    "tempest-surge": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.lightning_orb.01.loop.bluepurple.0"
        }
    ],
    "vitality-lash": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.energy_strands.range.standard.purple.04"
        },
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.energy_strands.range.standard.dark_green.04"
        }
    ],
    "void-warp": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.energy_strands.range.standard.purple"
        }
    ],
    "wildfire": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.ground_cracks.orange.02"
        }
    ],
    "blazing-bolt": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.scorching_ray.01.orange"
        }
    ],
    "darkness": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.darkness.black"
        }
    ],
    "floating-flame": [],
    "grease": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.grease.dark_brown.loop"
        }
    ],
    "harmonize-self": [
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.energy_strands.in.green.01.2"
        }
    ],
    "heat-metal": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [
                {
                    "not": "conservation-of-energy:cold"
                }
            ],
            "file": "jb2a.flames.orange.03.2x2"
        },
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.ice_spikes.radial.burst.white"
        }
    ],
    "inner-radiance-torrent": [
        {
            "trigger": "place-template",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.ranged.beam.001.01.orange"
        }
    ],
    "paranoia": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.eyes.01.dark_green.many"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.eyes.01.dark_yellow.many"
        }
    ],
    "powerful-inhalation": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.explosion.04.blue"
        }
    ],
    "revealing-light": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.markers.circle_of_stars.blue"
        }
    ],
    "worms-repast": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.butterflies.many.orange"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.butterflies.complete.01.white"
        }
    ],
    "combustion": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.flames.orange.03.2x2"
        }
    ],
    "earthbind": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.markers.chain.spectral_standard.complete.02.blue"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.markers.chain.diamond.loop.01.yellow"
        }
    ],
    "holy-light": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.guiding_bolt.01.blueyellow"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.eldritch_blast.rainbow"
        }
    ],
    "magnetic-acceleration": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.ranged.02.instant.01.yellow"
        }
    ],
    "bloodspray-curse": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.liquid.splash.red"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.liquid.splash.blue"
        }
    ],
    "cinder-swarm": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.fire_ring.500px.red"
        }
    ],
    "divine-wrath": [
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:free",
                {
                    "nor": [
                        "origin:item:trait:holy",
                        "origin:item:trait:unholy"
                    ]
                }
            ],
            "file": "jb2a.divine_smite.caster.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:free",
                "origin:item:trait:unholy"
            ],
            "file": "jb2a.divine_smite.caster.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:free",
                "origin:item:trait:holy"
            ],
            "file": "jb2a.divine_smite.caster.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                {
                    "nor": [
                        "origin:item:trait:holy",
                        "origin:item:trait:unholy"
                    ]
                }
            ],
            "file": "jb2a.divine_smite.caster.yellowwhite"
        },
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                "origin:item:trait:holy"
            ],
            "file": "jb2a.divine_smite.caster.yellowwhite"
        },
        {
            "trigger": "place-template",
            "role": "impact",
            "predicate": [
                "jb2a:patreon",
                "origin:item:trait:unholy"
            ],
            "file": "jb2a.divine_smite.caster.dark_purple"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                {
                    "nor": [
                        "origin:item:trait:holy",
                        "origin:item:trait:unholy"
                    ]
                }
            ],
            "file": "jb2a.divine_smite.target.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                "origin:item:trait:unholy"
            ],
            "file": "jb2a.divine_smite.target.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                "origin:item:trait:holy"
            ],
            "file": "jb2a.divine_smite.target.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                {
                    "nor": [
                        "origin:item:trait:holy",
                        "origin:item:trait:unholy"
                    ]
                }
            ],
            "file": "jb2a.divine_smite.target.yellowwhite"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                "origin:item:trait:holy"
            ],
            "file": "jb2a.divine_smite.target.yellowwhite"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                "origin:item:trait:unholy"
            ],
            "file": "jb2a.divine_smite.target.dark_purple"
        }
    ],
    "vision-of-death": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.toll_the_dead.green.skull_smoke"
        },
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.toll_the_dead.purple.skull_smoke"
        }
    ],
    "ymeris-mark": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.magic_signs.rune.transmutation.intro.yellow"
        },
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.explosion.01.orange"
        }
    ],
    "cone-of-cold": [],
    "entwined-roots": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.entangle.brown"
        }
    ],
    "flames-of-ego": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.markers.on_token_mask.complete.01.orange"
        }
    ],
    "flammable-fumes": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.wind_lines.01.01.white"
        }
    ],
    "freezing-rain": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.impact.frost.white.01"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "settings:persistent"
            ],
            "file": "jb2a.sleet_storm.blue"
        }
    ],
    "howling-blizzard": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "origin:item:area:type:cone",
                {
                    "not": "conservation-of-energy:fire"
                }
            ],
            "file": "jb2a.cone_of_cold.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "origin:item:area:type:cone",
                "conservation-of-energy:fire"
            ],
            "file": "jb2a.burning_hands.01.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "origin:item:area:type:burst",
                {
                    "not": "conservation-of-energy:fire"
                }
            ],
            "file": "jb2a.sleet_storm.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "origin:item:area:type:burst",
                "conservation-of-energy:fire"
            ],
            "file": "jb2a.fireball.explosion.orange"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [
                {
                    "not": "conservation-of-energy:fire"
                }
            ],
            "file": "jb2a.ice_spikes.radial.burst.white"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [
                "conservation-of-energy:fire"
            ],
            "file": "jb2a.impact.fire.01.orange.0"
        }
    ],
    "impaling-spike": [
        {
            "trigger": "damage-roll",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.template_line_piercing.generic.01.orange.15ft"
        }
    ],
    "pressure-zone": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.soundwave.01.blue"
        }
    ],
    "synesthesia": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.particles.swirl.greenyellow.01.01"
        }
    ],
    "toxic-cloud": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.darkness.green"
        }
    ],
    "disintegrate": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.disintegrate.green"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.disintegrate.dark_red"
        }
    ],
    "flame-vortex": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.template_circle.vortex.intro.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                "settings:persistent"
            ],
            "file": "jb2a.template_circle.vortex.loop.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.template_circle.vortex.intro.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:free",
                "conservation-of-energy:cold",
                "settings:persistent"
            ],
            "file": "jb2a.template_circle.vortex.loop.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.template_circle.vortex.intro.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                "settings:persistent"
            ],
            "file": "jb2a.template_circle.vortex.loop.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.template_circle.vortex.intro.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "jb2a:patreon",
                "conservation-of-energy:cold",
                "settings:persistent"
            ],
            "file": "jb2a.template_circle.vortex.loop.blue"
        }
    ],
    "spirit-blast": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.ranged.03.instant.01.bluegreen"
        }
    ],
    "polar-ray": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                {
                    "not": "conservation-of-energy:fire"
                }
            ],
            "file": "jb2a.ray_of_frost.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "conservation-of-energy:fire"
            ],
            "file": "jb2a.scorching_ray.01.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                {
                    "not": "conservation-of-energy:fire"
                }
            ],
            "file": "jb2a.ice_spikes.radial.burst.white"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "conservation-of-energy:fire"
            ],
            "file": "jb2a.fireball.explosion.orange"
        }
    ],
    "falling-stars": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.divine_smite.target.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.divine_smite.target.blueyellow"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.template_circle.out_pulse.02.burst.bluewhite"
        }
    ],
    "elemental-blast": [
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:air",
                "item:trait:electricity",
                "ranged"
            ],
            "file": "jb2a.chain_lightning.primary.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                "item:trait:electricity",
                "ranged",
                "action:cost:2"
            ],
            "file": "jb2a.static_electricity.03.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                "item:trait:electricity",
                "melee"
            ],
            "file": "jb2a.unarmed_strike.magical.01.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:air",
                "item:trait:electricity",
                "melee"
            ],
            "file": "jb2a.chain_lightning.secondary.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                "item:trait:electricity",
                "melee",
                "action:cost:2"
            ],
            "file": "jb2a.static_electricity.03.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:air",
                {
                    "not": "item:trait:electricity"
                },
                "ranged",
                "jb2a:patreon"
            ],
            "file": "jb2a.spell_projectile.earth.01.browngreen"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:air",
                {
                    "not": "item:trait:electricity"
                },
                "ranged",
                "jb2a:free"
            ],
            "file": "jb2a.gust_of_wind.veryfast"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                {
                    "not": "item:trait:electricity"
                },
                "ranged",
                "action:cost:2"
            ],
            "file": "jb2a.template_circle.aura.01.complete.small.bluepurple"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                {
                    "not": "item:trait:electricity"
                },
                "melee"
            ],
            "file": "jb2a.melee_generic.whirlwind.01.orange.1"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:air",
                {
                    "not": "item:trait:electricity"
                },
                "melee",
                "action:cost:2"
            ],
            "file": "jb2a.melee_generic.whirlwind.01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:earth"
            ],
            "file": "jb2a.boulder.toss.02.01.stone.brown"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:earth",
                "action:cost:2",
                "jb2a:patreon"
            ],
            "file": "jb2a.impact.earth.01.browngreen.0"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:earth",
                "action:cost:2",
                "jb2a:free"
            ],
            "file": "jb2a.scorched_earth.black"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:fire"
            ],
            "file": "jb2a.fire_bolt.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:fire",
                "action:cost:2"
            ],
            "file": "jb2a.impact.fire.01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:metal",
                "jb2a:free"
            ],
            "file": "jb2a.dagger.throw.01.white"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:metal",
                "jb2a:patreon"
            ],
            "file": "jb2a.dart.01.throw.physical.white"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:metal",
                "action:cost:2"
            ],
            "file": "jb2a.impact.003.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:water",
                "item:trait:cold"
            ],
            "file": "jb2a.spell_projectile.ice_shard.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:water",
                "item:trait:cold",
                "action:cost:2"
            ],
            "file": "jb2a.ice_spikes.radial.burst.white"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:water",
                {
                    "not": "item:trait:cold"
                },
                "jb2a:patreon"
            ],
            "file": "jb2a.ranged.04.projectile.01.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:water",
                {
                    "not": "item:trait:cold"
                },
                "jb2a:free"
            ],
            "file": "jb2a.ranged.04.projectile.01.green"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:water",
                {
                    "not": "item:trait:cold"
                },
                "action:cost:2"
            ],
            "file": "jb2a.impact.water.02.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:wood",
                {
                    "not": "item:trait:vitality"
                }
            ],
            "file": "jb2a.barrel.toss.wooden.01.01.brown"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:wood",
                {
                    "not": "item:trait:vitality"
                },
                "action:cost:2"
            ],
            "file": "jb2a.explosion.shrapnel.bomb.01.black"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:trait:wood",
                "item:trait:vitality"
            ],
            "file": "jb2a.ranged.03.instant.01.bluegreen"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:trait:wood",
                "item:trait:vitality",
                "action:cost:2"
            ],
            "file": "jb2a.energy_strands.in.green.01"
        }
    ],
    "flying-flame": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.pack_hound_missile.blue.01"
        }
    ],
    "diabolic-quill": [
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.template_line_piercing.void.01.purple"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.template_line_piercing.generic.01.orange"
        }
    ],
    "faerie-dust": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.markers.circle_of_stars.blue"
        }
    ],
    "heal-animal": [
        {
            "trigger": "damage-taken",
            "role": "projectile",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        1
                    ]
                },
                "jb2a:patreon"
            ],
            "file": "jb2a.bullet.01.green"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.healing_generic.400px.green"
        }
    ],
    "produce-flame": [
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.cast_generic.fire.side01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.fire_bolt.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "projectile",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.spell_projectile.ice_shard.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged"
            ],
            "file": "jb2a.impact.fire.01.orange.0"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "graphics-sfx.magic.ice.ranged.strike.impact.snowball.01"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:ranged",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.side_impact.ice_shard.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "jb2a:patreon"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.orange"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "jb2a:free"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.blue"
        },
        {
            "trigger": "attack-roll",
            "role": "impact",
            "predicate": [
                "item:melee",
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.unarmed_strike.magical.{01,02}.blue"
        }
    ],
    "blood-vendetta": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:patreon"
            ],
            "file": "jb2a.liquid.splash.red"
        },
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [
                "jb2a:free"
            ],
            "file": "jb2a.liquid.splash.blue"
        }
    ],
    "laughing-fit": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.icon.stun.purple"
        }
    ],
    "confusion": [
        {
            "trigger": "saving-throw",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.icon.stun.purple"
        }
    ],
    "breath-of-life": [
        {
            "trigger": "damage-taken",
            "role": "projectile",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        1
                    ]
                },
                "jb2a:patreon"
            ],
            "file": "jb2a.bullet.01.green"
        },
        {
            "trigger": "damage-taken",
            "role": "impact",
            "predicate": [],
            "file": "jb2a.healing_generic.400px.green"
        }
    ],
    "chain-lightning": [
        {
            "trigger": "damage-roll",
            "role": "projectile",
            "predicate": [],
            "file": "jb2a.chain_lightning.primary.blue"
        }
    ],
    "blazing-wave": [
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [],
            "file": "jb2a.burning_hands.01.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.burning_hands.01.orange"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "conservation-of-energy:cold"
            ],
            "file": "jb2a.cone_of_cold.blue"
        },
        {
            "trigger": "place-template",
            "role": "areaEffect",
            "predicate": [
                "conservation-of-energy:cold",
                {
                    "gte": [
                        "settings:quality",
                        2
                    ]
                }
            ],
            "file": "jb2a.cone_of_cold.blue"
        }
    ],
    "clinging-ice": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.ray_of_frost.blue"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.ice_spikes.radial.burst.white"}],
    "shield": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.shield.01"}],
    "shroud-of-night": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.darkness.black"}],
    "tangle-vine": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.vine.complete"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.entangle.green"}],
    "allegro": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.music_notations"}],
    "courageous-anthem": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.bardic_inspiration"}],
    "dirge-of-doom": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.music_notations"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.markers"}],
    "rallying-anthem": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.bardic_inspiration"}],
    "song-of-marching": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_buff"}],
    "song-of-strength": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_buff"}],
    "triple-time": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.music_notations"}],
    "uplifting-overture": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.music_notations"}],
    "figment": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.gust_of_wind.default"}],
    "forbidding-ward": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_buff.002.002"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.condition.boon.01.011.yellow"}],
    "guidance": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.guiding_bolt.01.greenorange"}],
    "light": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.dancing_light.blueteal"}],
    "prestidigitation": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.arcane_hand.purple"}],
    "read-aura": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.detect_magic.circle.green"}],
    "stabilize": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.healing_generic.200px.purple"}],
    "discern-secrets": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_buff.001.004.bluepurple"}],
    "evil-eye": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_cast.initiate.001.instant.combined.greenpurple"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.eyes"}],
    "house-of-imaginary-walls": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.energy_wall.01.circle.500x500.01.complete.blue"}],
    "know-the-way": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_buff.001.001.pinkyellow"}],
    "message": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.guiding_bolt.02.purplepink"}],
    "nudge-fate": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.on_token_cast.initiate.001.instant.combined.blueteal"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.on_token_buff.003.004.blue"}],
    "sigil": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.magic_signs.rune"}],
    "stoke-the-heart": [{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.condition.boon.01.001.red"}],
    "summon-instrument": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.markers.music"}],
    "telekinetic-hand": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.arcane_hand"}],
    "wilding-word": [{"trigger":"attack-roll","role":"tokenBuff","predicate":[],"file":"jb2a.condition.boon.01.023.green"},{"trigger":"attack-roll","role":"impact","predicate":[],"file":"jb2a.condition.curse.01.023.purple"}],
    "bullhorn": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.soundwave.01.blue"}],
    "gale-blast": [{"trigger":"attack-roll","role":"areaEffect","predicate":[],"file":"jb2a.whirlwind.bluegrey"}],
    "haunting-hymn": [{"trigger":"attack-roll","role":"areaEffect","predicate":["jb2a:patreon"],"file":"jb2a.side_impact.part.slow.music_note.pink"},{"trigger":"attack-roll","role":"areaEffect","predicate":["jb2a:free"],"file":"jb2a.side_impact.part.shockwave.blue"}],
    "live-wire": [{"trigger":"attack-roll","role":"projectile","predicate":[],"file":"jb2a.lightning_orb.01.loop.bluepurple.0"}],
    "puff-of-poison": [{"trigger":"attack-roll","role":"areaEffect","predicate":["jb2a:patreon"],"file":"jb2a.smoke.puff.side.green"},{"trigger":"attack-roll","role":"areaEffect","predicate":["jb2a:free"],"file":"jb2a.smoke.puff.side.grey"}],
    "scatter-scree": [{"trigger":"attack-roll","role":"areaEffect","predicate":[],"file":"jb2a.falling_rocks.side.2x1.grey"}],
    "spout": [{"trigger":"attack-roll","role":"areaEffect","predicate":[],"file":"jb2a.water_splash.circle.01.blue"}],
    "bullhorn": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]}],"file":"jb2a.soundwave.01.blue"}],
    "gale-blast": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]}],"file":"jb2a.whirlwind.bluegrey"}],
    "haunting-hymn": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]},"jb2a:patreon"],"file":"jb2a.side_impact.part.slow.music_note.pink"},{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]},"jb2a:free"],"file":"jb2a.side_impact.part.shockwave.blue"}],
    "puff-of-poison": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]},"jb2a:patreon"],"file":"jb2a.smoke.puff.side.green"},{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]},"jb2a:free"],"file":"jb2a.smoke.puff.side.grey"}],
    "scatter-scree": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]}],"file":"jb2a.falling_rocks.side.2x1.grey"}],
    "spout": [{"trigger":"saving-throw","role":"impact","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]}],"file":"jb2a.water_splash.circle.01.blue"}],
    "wilding-word": [{"trigger":"saving-throw","role":"tokenBuff","predicate":[{"or":["check:outcome:failure","check:outcome:critical-failure"]}],"file":"jb2a.condition.curse.01.023.purple"}]
};
