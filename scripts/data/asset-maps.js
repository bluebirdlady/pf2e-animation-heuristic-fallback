// ============================================================
// DATA: Static dictionaries and lookup tables consumed by
// core/asset-resolution.js and core/spell-parser.js. No logic here.
// ============================================================
const KEYWORD_MAP = {
    fire: { color: "orange", trait: "fire" },
    flame: { color: "orange", trait: "fire" },
    burn: { color: "orange", trait: "fire" },
    blaze: { color: "orange", trait: "fire" },
    incinerate: { color: "orange", trait: "fire" },
    acid: { color: "green", trait: "acid" },
    corrosive: { color: "green", trait: "acid" },
    slime: { color: "green", trait: "acid" },
    cold: { color: "blue", trait: "cold" },
    ice: { color: "blue", trait: "cold" }, 
    frost: { color: "blue", trait: "cold" },
    chill: { color: "blue", trait: "cold" },
    lightning: { color: "blueyellow", trait: "electricity" },
    electric: { color: "blueyellow", trait: "electricity" },
    shock: { color: "blueyellow", trait: "electricity" },
    thunder: { color: "purple", trait: "sonic" },
    sonic: { color: "purple", trait: "sonic" },
    force: { color: "purple", trait: "force" },
    telekinetic: { color: "purple", trait: "force" },
    heal: { color: "holy", trait: "healing" },
    holy: { color: "holy", trait: "good" },
    divine: { color: "holy", trait: "good" },
    necrotic: { color: "dark_purple", trait: "negative" },
    negative: { color: "dark_purple", trait: "negative" },
    void: { color: "dark_purple", trait: "negative" },
    death: { color: "dark_purple", trait: "negative" },
    poison: { color: "green", trait: "poison" },
    toxic: { color: "green", trait: "poison" },
    // NEW (Phase H): Additional PF2e damage/alignment trait coverage
    mental: { color: "pinkpurple", trait: "mental" },
    psychic: { color: "pinkpurple", trait: "mental" },
    vitality: { color: "yellow", trait: "vitality" },
    positive: { color: "yellow", trait: "vitality" },
    radiant: { color: "yellow", trait: "vitality" },
    chaotic: { color: "red", trait: "chaotic" },
    evil: { color: "dark_purple", trait: "evil" },
    good: { color: "yellow", trait: "good" },
    lawful: { color: "blue", trait: "lawful" },
    bleed: { color: "red", trait: "bleed" },
    bleeding: { color: "red", trait: "bleed" }
};

// NEW (Phase I): jb2a.magic_signs.circle.02.{school}.{stage}.{color} only
// covers a 12-color set (blue, dark_blue, dark_green, dark_pink, dark_purple,
// dark_red, dark_yellow, green, pink, purple, red, yellow). Several KEYWORD_MAP
// colors fall outside that set, so cast/ground rings would otherwise fall
// back to a generic blue ring for those elements. This table maps those
// out-of-set colors to their nearest equivalent within the 12-color family,
// and is consulted only when resolving castRing/groundRing.
const RING_COLOR_ALIASES = {
    orange: "dark_yellow",
    blueyellow: "yellow",
    holy: "yellow",
    pinkpurple: "pink",
    bluegreen: "green",
    gold: "yellow"
};

const EXPLICIT_DATABASE_MAP = {
    castRing: [
        "jb2a.magic_signs.circle.02.abjuration.complete.{color}",
        "jb2a.magic_signs.circle.01.abjuration.{color}",
        "jb2a.magic_signs.circle.01.abjuration.blue"
    ],
    groundRing: [
        "jb2a.magic_signs.circle.02.abjuration.complete.{color}",
        "jb2a.magic_signs.circle.01.abjuration.{color}",
        "jb2a.magic_signs.circle.01.abjuration.blue"
    ],
    impact: [
        "jb2a.fireball.explosion.{color}",
        "jb2a.fireball.explosion.dark_{color}",
        "jb2a.explosion.01.{color}",
        "jb2a.impact.001.{color}",
        "jb2a.impact.002.{color}",
        "jb2a.impact.011.{color}",
        "jb2a.impact.001.blue"
    ],
    projectile: [
        "jb2a.fire_bolt.{color}",
        "jb2a.fireball.beam.{color}",
        "jb2a.magic_missile.{color}",
        "jb2a.magic_missile.blue",
        "jb2a.fire_bolt.orange"
    ],
    tokenBuff: [
        "jb2a.energy_field.02.above.{color}",
        "jb2a.energy_field.02.below.{color}",
        "jb2a.bless.01.loop.{color}",
        "jb2a.bless.200px.loop.{color}",
        "jb2a.shimmer.01.{color}",
        "jb2a.shimmer.01.blue"
    ]
};

// ============================================================
// 2.0.1 PF2E GRAPHICS ASSET MAP (NEW - Phase J)
// ============================================================
// Mined from the (now-unmaintained) PF2e Graphics module's older animation
// data set via resources/extract_pf2e_graphics.py. Maps spell slugs to
// hand-curated JB2A asset candidates by role:
//   - projectile: cast-to-target ranged effect (preset "ranged")
//   - impact:     effect on the target (preset "onToken"/"melee")
//   - areaEffect: template-centered effect (preset "template")
// resolvePf2eGraphicsAsset() validates each candidate in order via
// isValidSequencerPath() and returns the first that resolves, or null if
// none do (in which case the heuristic-derived asset is kept).
const PF2E_GRAPHICS_ASSET_MAP = {
    "acid-splash": {
        "projectile": [
            "jb2a.fire_bolt.green"
        ],
        "impact": [
            "jb2a.liquid.splash.green"
        ]
    },
    "admonishing-ray": {
        "projectile": [
            "jb2a.ranged.02.instant.01.yellow",
            "jb2a.ranged.02.instant.01.purple"
        ]
    },
    "alarm": {
        "areaEffect": [
            "jb2a.magic_signs.circle.02.abjuration.intro.blue",
            "jb2a.magic_signs.circle.02.abjuration.complete.blue"
        ]
    },
    "breathe-fire": {
        "areaEffect": [
            "jb2a.burning_hands.01.orange",
            "jb2a.cone_of_cold.blue"
        ]
    },
    "briny-bolt": {
        "projectile": [
            "jb2a.ranged.04.projectile.01.green",
            "jb2a.ranged.04.projectile.01.blue"
        ]
    },
    "caustic-blast": {
        "projectile": [
            "jb2a.fire_bolt.green"
        ],
        "areaEffect": [
            "jb2a.liquid.splash.green"
        ]
    },
    "charm": {
        "impact": [
            "jb2a.whirlwind.purple"
        ]
    },
    "chilling-spray": {
        "areaEffect": [
            "jb2a.cone_of_cold.blue"
        ]
    },
    "command": {
        "impact": [
            "jb2a.template_circle.out_pulse.02.burst"
        ]
    },
    "crushing-ground": {
        "impact": [
            "jb2a.impact.ground_crack.02.orange"
        ]
    },
    "daze": {
        "projectile": [
            "jb2a.fire_bolt.orange",
            "jb2a.fire_bolt.purple"
        ]
    },
    "detect-magic": {
        "areaEffect": [
            "jb2a.detect_magic.circle"
        ]
    },
    "divine-lance": {
        "projectile": [
            "jb2a.ranged.02.instant.01.yellow",
            "jb2a.ranged.01.instant.01.dark_orange",
            "jb2a.ranged.01.instant.01.dark_purple"
        ]
    },
    "dizzying-colors": {
        "areaEffect": [
            "jb2a.breath_weapons.cold.cone.blue",
            "jb2a.breath_weapons.cold.cone.green",
            "jb2a.breath_weapons.cold.cone.orange",
            "jb2a.breath_weapons.cold.cone.purple"
        ]
    },
    "electric-arc": {
        "projectile": [
            "jb2a.chain_lightning.primary.blue"
        ]
    },
    "enfeeble": {
        "projectile": [
            "jb2a.eldritch_blast.dark_red"
        ]
    },
    "force-barrage": {
        "projectile": [
            "jb2a.magic_missile.purple"
        ]
    },
    "frostbite": {
        "projectile": [
            "jb2a.ray_of_frost.blue"
        ]
    },
    "gale-blast": {
        "areaEffect": [
            "jb2a.whirlwind.bluegrey"
        ]
    },
    "gouging-claw": {
        "impact": [
            "jb2a.melee_generic.piercing.one_handed",
            "jb2a.melee_generic.slashing.one_handed"
        ]
    },
    "grim-tendrils": {
        "areaEffect": [
            "jb2a.energy_strands.range.multiple.purple.01"
        ]
    },
    "haunting-hymn": {
        "areaEffect": [
            "jb2a.side_impact.part.shockwave.blue",
            "jb2a.side_impact.part.slow.music_note.pink"
        ]
    },
    "heal": {
        "projectile": [
            "jb2a.bullet.01.green"
        ],
        "impact": [
            "jb2a.healing_generic.400px.green"
        ]
    },
    "ignition": {
        "impact": [
            "jb2a.cast_generic.fire.side01.orange.0",
            "jb2a.impact.fire.01.orange.0",
            "jb2a.side_impact.ice_shard.blue",
            "jb2a.unarmed_strike.magical.{01,02}.orange",
            "jb2a.unarmed_strike.magical.{01,02}.blue"
        ],
        "projectile": [
            "jb2a.fire_bolt.orange",
            "jb2a.spell_projectile.ice_shard.blue"
        ]
    },
    "imaginary-weapon": {
        "impact": [
            "jb2a.melee_attack.02.trail.01.blueyellow"
        ]
    },
    "kinetic-ram": {
        "impact": [
            "jb2a.melee_generic.bludgeoning.two_handed"
        ],
        "areaEffect": [
            "jb2a.explosion.04.dark_purple"
        ]
    },
    "lay-on-hands": {
        "impact": [
            "jb2a.cure_wounds.400px.blue"
        ]
    },
    "lose-the-path": {
        "impact": [
            "jb2a.magic_signs.rune.illusion.complete.purple",
            "jb2a.magic_signs.rune.illusion.complete.green"
        ]
    },
    "mushroom-patch": {
        "areaEffect": [
            "jb2a.plant_growth.03.round.4x4.complete.greenyellow"
        ]
    },
    "needle-darts": {
        "projectile": [
            "jb2a.bolt.physical.orange",
            "jb2a.bolt.physical.white"
        ]
    },
    "phase-bolt": {
        "projectile": [
            "jb2a.bolt.physical.orange",
            "jb2a.bolt.physical.purple"
        ]
    },
    "puff-of-poison": {
        "projectile": [
            "jb2a.smoke.puff.side.green",
            "jb2a.smoke.puff.side.grey"
        ]
    },
    "ray-of-frost": {
        "projectile": [
            "jb2a.ray_of_frost.blue"
        ]
    },
    "scatter-scree": {
        "areaEffect": [
            "jb2a.falling_rocks.side.2x1.grey"
        ]
    },
    "schadenfreude": {
        "impact": [
            "jb2a.icon.stun.purple"
        ]
    },
    "soothe": {
        "projectile": [
            "jb2a.energy_strands.range.standard.dark_green"
        ],
        "impact": [
            "jb2a.healing_generic.400px.green"
        ]
    },
    "spout": {
        "areaEffect": [
            "jb2a.water_splash.circle.01.blue"
        ]
    },
    "telekinetic-projectile": {
        "projectile": [
            "jb2a.boulder.toss.02.01.stone.brown",
            "jb2a.slingshot",
            "jb2a.dart.01.throw.physical.white"
        ],
        "impact": [
            "jb2a.template_line_piercing.generic.01.orange",
            "jb2a.melee_generic.slash.01.orange",
            "jb2a.melee_generic.slashing"
        ]
    },
    "telekinetic-rend": {
        "areaEffect": [
            "jb2a.falling_rocks.top.1x1.grey",
            "jb2a.whirlwind.bluegrey"
        ]
    },
    "tempest-surge": {
        "impact": [
            "jb2a.lightning_orb.01.loop.bluepurple.0"
        ]
    },
    "vitality-lash": {
        "projectile": [
            "jb2a.energy_strands.range.standard.purple.04",
            "jb2a.energy_strands.range.standard.dark_green.04"
        ]
    },
    "void-warp": {
        "projectile": [
            "jb2a.energy_strands.range.standard.purple"
        ]
    },
    "wildfire": {
        "areaEffect": [
            "jb2a.ground_cracks.orange.02"
        ]
    },
    "blazing-bolt": {
        "projectile": [
            "jb2a.scorching_ray.01.orange"
        ]
    },
    "darkness": {
        "areaEffect": [
            "jb2a.darkness.black"
        ]
    },
    "grease": {
        "impact": [
            "jb2a.grease.dark_brown.loop"
        ]
    },
    "harmonize-self": {
        "impact": [
            "jb2a.energy_strands.in.green.01.2"
        ]
    },
    "heat-metal": {
        "impact": [
            "jb2a.flames.orange.03.2x2",
            "jb2a.ice_spikes.radial.burst.white"
        ]
    },
    "inner-radiance-torrent": {
        "projectile": [
            "jb2a.ranged.beam.001.01.orange"
        ]
    },
    "paranoia": {
        "impact": [
            "jb2a.eyes.01.dark_green.many",
            "jb2a.eyes.01.dark_yellow.many"
        ]
    },
    "powerful-inhalation": {
        "areaEffect": [
            "jb2a.explosion.04.blue"
        ]
    },
    "revealing-light": {
        "areaEffect": [
            "jb2a.markers.circle_of_stars.blue"
        ]
    },
    "worms-repast": {
        "impact": [
            "jb2a.butterflies.many.orange",
            "jb2a.butterflies.complete.01.white"
        ]
    },
    "combustion": {
        "impact": [
            "jb2a.flames.orange.03.2x2"
        ]
    },
    "earthbind": {
        "impact": [
            "jb2a.markers.chain.spectral_standard.complete.02.blue",
            "jb2a.markers.chain.diamond.loop.01.yellow"
        ]
    },
    "holy-light": {
        "projectile": [
            "jb2a.guiding_bolt.01.blueyellow",
            "jb2a.eldritch_blast.rainbow"
        ]
    },
    "magnetic-acceleration": {
        "projectile": [
            "jb2a.ranged.02.instant.01.yellow"
        ]
    },
    "bloodspray-curse": {
        "impact": [
            "jb2a.liquid.splash.red",
            "jb2a.liquid.splash.blue"
        ]
    },
    "cinder-swarm": {
        "areaEffect": [
            "jb2a.fire_ring.500px.red"
        ]
    },
    "divine-wrath": {
        "impact": [
            "jb2a.divine_smite.caster.blueyellow",
            "jb2a.divine_smite.caster.yellowwhite",
            "jb2a.divine_smite.caster.dark_purple"
        ],
        "areaEffect": [
            "jb2a.divine_smite.target.blueyellow",
            "jb2a.divine_smite.target.yellowwhite",
            "jb2a.divine_smite.target.dark_purple"
        ]
    },
    "vision-of-death": {
        "impact": [
            "jb2a.toll_the_dead.green.skull_smoke",
            "jb2a.toll_the_dead.purple.skull_smoke"
        ]
    },
    "ymeris-mark": {
        "impact": [
            "jb2a.magic_signs.rune.transmutation.intro.yellow",
            "jb2a.explosion.01.orange"
        ]
    },
    "entwined-roots": {
        "areaEffect": [
            "jb2a.entangle.brown"
        ]
    },
    "flames-of-ego": {
        "impact": [
            "jb2a.markers.on_token_mask.complete.01.orange"
        ]
    },
    "flammable-fumes": {
        "areaEffect": [
            "jb2a.wind_lines.01.01.white"
        ]
    },
    "freezing-rain": {
        "areaEffect": [
            "jb2a.impact.frost.white.01",
            "jb2a.sleet_storm.blue"
        ]
    },
    "howling-blizzard": {
        "areaEffect": [
            "jb2a.cone_of_cold.blue",
            "jb2a.burning_hands.01.orange",
            "jb2a.sleet_storm.blue",
            "jb2a.fireball.explosion.orange"
        ],
        "impact": [
            "jb2a.ice_spikes.radial.burst.white",
            "jb2a.impact.fire.01.orange.0"
        ]
    },
    "impaling-spike": {
        "impact": [
            "jb2a.template_line_piercing.generic.01.orange.15ft"
        ]
    },
    "pressure-zone": {
        "areaEffect": [
            "jb2a.soundwave.01.blue"
        ]
    },
    "synesthesia": {
        "impact": [
            "jb2a.particles.swirl.greenyellow.01.01"
        ]
    },
    "toxic-cloud": {
        "areaEffect": [
            "jb2a.darkness.green"
        ]
    },
    "disintegrate": {
        "projectile": [
            "jb2a.disintegrate.green",
            "jb2a.disintegrate.dark_red"
        ]
    },
    "flame-vortex": {
        "areaEffect": [
            "jb2a.template_circle.vortex.intro.blue",
            "jb2a.template_circle.vortex.loop.blue",
            "jb2a.template_circle.vortex.intro.orange",
            "jb2a.template_circle.vortex.loop.orange"
        ]
    },
    "spirit-blast": {
        "projectile": [
            "jb2a.ranged.03.instant.01.bluegreen"
        ]
    },
    "polar-ray": {
        "projectile": [
            "jb2a.ray_of_frost.blue",
            "jb2a.scorching_ray.01.orange"
        ],
        "impact": [
            "jb2a.ice_spikes.radial.burst.white",
            "jb2a.fireball.explosion.orange"
        ]
    },
    "falling-stars": {
        "areaEffect": [
            "jb2a.divine_smite.target.blueyellow",
            "jb2a.template_circle.out_pulse.02.burst.bluewhite"
        ]
    }
};

// ============================================================
// 2.1 ENHANCED CLASSIFICATION DICTIONARY (NEW - Part 1.1)
// ============================================================
// This layer adds richer spell understanding without breaking existing routing.
// Only activated if advancedClassification setting is enabled.
const ENHANCED_CLASSIFICATION = {
    traditions: {
        arcane: "jb2a.magic_signs.circle.02.enchantment.intro",
        divine: "jb2a.magic_signs.circle.02.abjuration.intro",
        occult: "jb2a.magic_signs.circle.02.necromancy.intro",
        primal: "jb2a.magic_signs.circle.02.conjuration.intro"
    },
    schools: {
        evocation:     { overlay: "jb2a.energy_strands", color: "red" },
        necromancy:    { overlay: "jb2a.skull",          color: "dark_purple" },
        enchantment:   { overlay: "jb2a.rings",          color: "pink" },
        illusion:      { overlay: "jb2a.glimmer",        color: "purple" },
        transmutation: { overlay: "jb2a.morph",          color: "orange" },
        abjuration:    { overlay: "jb2a.shield",         color: "blue" },
        conjuration:   { overlay: "jb2a.portal",         color: "bluegreen" },
        divination:    { overlay: "jb2a.eye",            color: "gold" }
    },
    restraints: {
        nature:  { ground: "jb2a.entangle.green",    overlay: "jb2a.entangle.02.loop.02.green" },
        force:   { ground: "jb2a.shattered_earth",  overlay: "jb2a.markers.chain.diamond.loop.01.purple" },
        default: { ground: "jb2a.magic_signs.circle",overlay: "jb2a.markers.chain.diamond.loop.01.grey" }
    }
};

// ============================================================
// 2.2 ENHANCED KEYWORD MAP (NEW - Phase B)
// ============================================================
// Secondary keyword dictionary used only by applyEnhancedClassification()
// (i.e. only when "advancedClassification" is enabled). Kept separate from
// KEYWORD_MAP so the existing color/blend-mode routing loop (which stops at
// the first match) is completely unaffected.
const ENHANCED_KEYWORD_MAP = {
    // School keywords (used as a fallback when traits don't include the school)
    evocation:     { school: "evocation" },
    necromancy:    { school: "necromancy" },
    enchantment:   { school: "enchantment" },
    illusion:      { school: "illusion" },
    transmutation: { school: "transmutation" },
    abjuration:    { school: "abjuration" },
    conjuration:   { school: "conjuration" },
    divination:    { school: "divination" },

    // Tradition keywords (fallback when traits don't include the tradition)
    arcane: { tradition: "arcane" },
    divine: { tradition: "divine" },
    occult: { tradition: "occult" },
    primal: { tradition: "primal" },

    // Restraint / crowd-control condition keywords (informational only for
    // now - consumed by a future Phase G persistent-effects system)
    entangle:    { condition: "entangled" },
    entangled:   { condition: "entangled" },
    restrain:    { condition: "restrained" },
    restrained:  { condition: "restrained" },
    immobilize:  { condition: "immobilized" },
    immobilized: { condition: "immobilized" },
    grab:        { condition: "grabbed" },
    grabbed:     { condition: "grabbed" },
    paralyze:    { condition: "paralyzed" },
    paralyzed:   { condition: "paralyzed" }
};

// ============================================================
// 3.1 ASSET FALLBACK CHAINS (NEW - Part 1.2)
// ============================================================
// Last-resort generators tried only if EXPLICIT_DATABASE_MAP yields nothing.
// Each entry is a function taking the preferred color and returning a path to test.
const ASSET_FALLBACK_CHAIN = {
    castRing: [
        (color) => `jb2a.magic_signs.circle.02.abjuration.${color}`,
        () => "jb2a.magic_signs.circle.02.abjuration.blue",
        () => "jb2a.magic_signs.circle.ground.blue"
    ],
    groundRing: [
        (color) => `jb2a.magic_signs.circle.02.abjuration.${color}`,
        () => "jb2a.magic_signs.circle.02.abjuration.blue",
        () => "jb2a.magic_signs.circle.ground.blue"
    ],
    impact: [
        (color) => `jb2a.impact.themed.${color}`,
        () => "jb2a.impact.001.blue"
    ],
    projectile: [
        (color) => `jb2a.energy_strands.range.standard.${color}`,
        () => "jb2a.magic_missile.blue"
    ],
    tokenBuff: [
        (color) => `jb2a.energy_field.01.${color}`,
        () => "jb2a.shimmer.01.blue"
    ]
};

// ============================================================
// 3.3 ELEMENTAL AREA SHAPES (NEW - Phase H)
// ============================================================
// JB2A's "breath_weapons" family provides element-specific cone/line
// effects that are far more distinctive than the generic burst/projectile
// templates. Only used when the spell's area type is "cone" or "line" AND
// a matching elemental asset is available; otherwise the existing
// burst/projectile pipelines are used unchanged (graceful degradation).
const ELEMENTAL_AREA_ASSETS = {
    fire:        { cone: "jb2a.breath_weapons.fire.cone.orange.02",  line: "jb2a.breath_weapons.fire.line.orange" },
    cold:        { cone: "jb2a.breath_weapons.cold.cone.blue" },
    acid:        { line: "jb2a.breath_weapons.acid.line.green" },
    electricity: { line: "jb2a.breath_weapons.lightning.line.blue" },
    poison:      { cone: "jb2a.breath_weapons.poison.cone.green" }
};
