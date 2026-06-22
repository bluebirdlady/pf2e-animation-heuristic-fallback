// ============================================================
// DATA: Predicate-tagged attack-roll animation candidates for weapon
// strikes, mined from PF2e Graphics (resources/extract_pf2e_strike_trees.py
// output, Phase K4). Three lookup tables, keyed by weapon slug, base weapon
// type, and weapon group respectively - resolveStrikeAnimationAsset() in
// core/animation-tree-resolver.js tries bySlug, then byBase, then byGroup
// (most specific first), evaluating each candidate's predicate via
// evaluatePredicate() before checking isValidSequencerPath().
// ============================================================
const PF2E_STRIKE_TREES = {
    "bySlug": {
        "acid-flask-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.03.green"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.liquid.splash.bright_green"
            }
        ],
        "alchemists-fire-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.red"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.03.red"
            }
        ],
        "blight-bomb-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.pumpkin.toss"
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
        "bottled-lightning-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.static_electricity.03.blue"
            }
        ],
        "claws": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.claws.400px.red"
            }
        ],
        "dread-ampoule-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.purple"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    {
                        "or": [
                            "check:outcome:success",
                            "check:outcome:failure",
                            "check:outcome:critical-failure"
                        ]
                    }
                ],
                "file": "jb2a.smoke.puff.ring.01.white.1"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "check:outcome:critical-success"
                ],
                "file": "jb2a.smoke.puff.ring.01.white.0"
            }
        ],
        "frost-vial-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.05.bluewhite"
            }
        ],
        "glue-bomb-lesser": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.liquid.splash.blue"
            }
        ],
        "horn": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.template_line_piercing.generic.01.orange"
            }
        ],
        "jaws": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.bite.400px.red"
            }
        ],
        "tail": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.bludgeoning.one_handed"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.energy_strands.range.standard.purple.04"
            }
        ],
        "trident": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    {
                        "not": "thrown"
                    }
                ],
                "file": "jb2a.spear.melee.01.white.2"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "thrown",
                    "jb2a:patreon"
                ],
                "file": "jb2a.spear.throw.01"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "thrown",
                    "jb2a:free"
                ],
                "file": "jb2a.template_line_piercing.generic.01.orange"
            }
        ],
        "acid-flask-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.03.green"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.liquid.splash.bright_green"
            }
        ],
        "acid-flask-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.03.green"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.liquid.splash.bright_green"
            }
        ],
        "acid-flask-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.03.green"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.liquid.splash.bright_green"
            }
        ],
        "alchemists-fire-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.red"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.03.red"
            }
        ],
        "alchemists-fire-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.red"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.03.red"
            }
        ],
        "alchemists-fire-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.red"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.03.red"
            }
        ],
        "blight-bomb-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.pumpkin.toss"
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
        "blight-bomb-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.pumpkin.toss"
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
        "blight-bomb-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.pumpkin.toss"
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
        "bottled-lightning-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.static_electricity.03.blue"
            }
        ],
        "bottled-lightning-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.static_electricity.03.blue"
            }
        ],
        "bottled-lightning-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.static_electricity.03.blue"
            }
        ],
        "claw": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.claws.400px.red"
            }
        ],
        "dread-ampoule-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.purple"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    {
                        "or": [
                            "check:outcome:success",
                            "check:outcome:failure",
                            "check:outcome:critical-failure"
                        ]
                    }
                ],
                "file": "jb2a.smoke.puff.ring.01.white.1"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "check:outcome:critical-success"
                ],
                "file": "jb2a.smoke.puff.ring.01.white.0"
            }
        ],
        "dread-ampoule-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.purple"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    {
                        "or": [
                            "check:outcome:success",
                            "check:outcome:failure",
                            "check:outcome:critical-failure"
                        ]
                    }
                ],
                "file": "jb2a.smoke.puff.ring.01.white.1"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "check:outcome:critical-success"
                ],
                "file": "jb2a.smoke.puff.ring.01.white.0"
            }
        ],
        "dread-ampoule-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.purple"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    {
                        "or": [
                            "check:outcome:success",
                            "check:outcome:failure",
                            "check:outcome:critical-failure"
                        ]
                    }
                ],
                "file": "jb2a.smoke.puff.ring.01.white.1"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "check:outcome:critical-success"
                ],
                "file": "jb2a.smoke.puff.ring.01.white.0"
            }
        ],
        "frost-vial-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.05.bluewhite"
            }
        ],
        "frost-vial-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.05.bluewhite"
            }
        ],
        "frost-vial-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.02.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.explosion.05.bluewhite"
            }
        ],
        "glue-bomb-major": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.liquid.splash.blue"
            }
        ],
        "glue-bomb-greater": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.liquid.splash.blue"
            }
        ],
        "glue-bomb-moderate": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.throwable.throw.flask.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.throwable.throw.flask.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.liquid.splash.blue"
            }
        ],
        "jaw": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.bite.400px.red"
            }
        ]
    },
    "byBase": {
        "butterfly-sword": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee"
                ],
                "file": "jb2a.melee_attack.01.butterflysword"
            }
        ],
        "chain-sword": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    "jb2a:free"
                ],
                "file": "jb2a.melee_attack.03.khybersword"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.slashing.two_handed"
            }
        ],
        "rapier": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee"
                ],
                "file": "jb2a.rapier.melee.01.white"
            }
        ],
        "shield-boss": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.bludgeoning.one_handed"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:free"
                ],
                "file": "jb2a.melee_attack.06.shield.01.0"
            }
        ],
        "shield-spikes": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.piercing.two_handed"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    "jb2a:free"
                ],
                "file": "jb2a.melee_attack.06.shield.01.0"
            }
        ]
    },
    "byGroup": {
        "bomb": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [],
                "file": "jb2a.throwable.throw.bomb.01.black"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.explosion.01.orange"
            }
        ],
        "brawling": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.unarmed_strike.physical.01.yellow"
            }
        ],
        "crossbow": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.bolt.physical.white02"
            }
        ],
        "dart": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.dart.01.throw"
            }
        ],
        "firearm": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [],
                "file": "jb2a.bullet.01.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    {
                        "lte": [
                            "item:damage:die:faces",
                            6
                        ]
                    }
                ],
                "file": "jb2a.bullet.02.orange"
            }
        ],
        "flail": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.bludgeoning.one_handed"
            }
        ],
        "hammer": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee"
                ],
                "file": "jb2a.melee_attack.02.hammer"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    {
                        "gte": [
                            "item:damage:die:faces",
                            8
                        ]
                    }
                ],
                "file": "jb2a.melee_attack.02.warhammer"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "thrown",
                    "jb2a:patreon"
                ],
                "file": "jb2a.hammer.throw"
            }
        ],
        "knife": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "thrown"
                ],
                "file": "jb2a.dagger.throw.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "thrown",
                    "item:rune:property:frost",
                    "jb2a:patreon"
                ],
                "file": "jb2a.dagger.throw.01.blue"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee"
                ],
                "file": "jb2a.dagger.melee.02.white"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee",
                    "item:rune:property:frost",
                    "jb2a:patreon"
                ],
                "file": "jb2a.dagger.melee.fire.blue"
            }
        ],
        "pick": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.melee_generic.piercing.one_handed"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.melee_attack.03.trail.01.blueyellow"
            }
        ],
        "shield": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [],
                "file": "jb2a.melee_attack.06.shield.01"
            }
        ],
        "sling": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon"
                ],
                "file": "jb2a.slingshot"
            }
        ],
        "spear": [
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:patreon",
                    "thrown"
                ],
                "file": "jb2a.spear.throw.01"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:patreon",
                    "melee"
                ],
                "file": "jb2a.spear.melee.01.white"
            },
            {
                "trigger": "attack-roll",
                "role": "projectile",
                "predicate": [
                    "jb2a:free",
                    "thrown"
                ],
                "file": "jb2a.bolt.physical.orange"
            },
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "jb2a:free",
                    "melee"
                ],
                "file": "jb2a.spear.melee.01.white"
            }
        ],
        "sword": [
            {
                "trigger": "attack-roll",
                "role": "impact",
                "predicate": [
                    "melee"
                ],
                "file": "jb2a.sword.melee.01.white"
            }
        ]
    }
};
