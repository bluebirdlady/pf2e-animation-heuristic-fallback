/**
 * PF2e Heuristic Fallback Animation Engine
 * Version: 7.1.1+ Enhanced (With Layered Classification System)
 *
 * Part 1.1: Added non-breaking enhanced classification layer
 * - Original keyword routing remains fully functional
 * - New classification is opt-in via "advancedClassification" setting
 * - Layers richer spell understanding without replacing existing logic
 *
 * Part 1.2: Added asset fallback chains
 * - resolveVerifiedAssetPath() behavior unchanged for all existing callers
 * - resolveAssetWithFallback() tries EXPLICIT_DATABASE_MAP first, then a
 *   small ASSET_FALLBACK_CHAIN of generic JB2A paths before giving up
 * - Always degrades gracefully to null, never throws
 *
 * Phase A: Added curated spell support
 * - getCuratedSpellSet() indexes macro names from the "PF2e Animation
 *   Macros (JB2A)" module (pf2e-jb2a-macros), if installed and active
 * - Spells matching a curated macro are skipped by the heuristic engine
 *   (opt-out via "skipCuratedSpells" setting, default on)
 * - CURATED_SET_EXCLUDE filters out admin/utility macros (e.g. "Cone
 *   Template", "Export Autorec JSON") whose generic names could collide
 *   with real spell slugs
 * - If the module/pack is unavailable, the set is empty and behavior is
 *   identical to before this phase
 *
 * Phase B: Enhanced keyword classification
 * - ENHANCED_KEYWORD_MAP adds school/tradition/condition keyword detection
 *   as a fallback when spell traits don't directly name them
 * - Detects restraint/CC condition keywords (entangled, restrained,
 *   immobilized, grabbed, paralyzed) and records them on the config for a
 *   future Phase G persistent-effects system
 * - Entirely gated behind "advancedClassification" (same flag as Part 1.1);
 *   no effect when that setting is off
 */

// ============================================================
// 1. MODULE SETTINGS INITIALIZATION
// ============================================================
const registerSettings = () => {
    const safeRegister = (key, data) => {
        try {
            game.settings.register("pf2e-heuristic-fallback", key, data);
        } catch (e) {
            console.debug(`PF2e Heuristic | Key "${key}" already initialized.`);
        }
    };

    safeRegister("enable", {
        name: "Enable Heuristic Fallback Animations",
        hint: "Automatically plays best-guess visual effects for spells missing explicit macros.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    safeRegister("lingeringEffects", {
        name: "Enable Lingering Elemental Effects",
        hint: "After a projectile hits, add a short-lived ground sign effect.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    safeRegister("blendModes", {
        name: "Use ADD Blend Mode for Energy Spells",
        hint: "Applies additive blending to projectiles and impacts for fire, lightning, etc.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    safeRegister("advancedClassification", {
        name: "Enable Advanced Spell Classification (Experimental)",
        hint: "Layer richer spell analysis (traditions, schools) on top of keyword matching. Non-breaking.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    safeRegister("skipCuratedSpells", {
        name: "Defer to Curated Animation Macros",
        hint: "If a spell has a hand-crafted macro in the PF2e Animation Macros (JB2A) module, skip the heuristic animation for it.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
};

if (game.ready || game.canvas?.ready) {
    registerSettings();
} else {
    Hooks.once("init", registerSettings);
}

const getSettingSafe = (key) => {
    try {
        if (game.settings.settings.has(`pf2e-heuristic-fallback.${key}`)) {
            return game.settings.get("pf2e-heuristic-fallback", key);
        }
    } catch(e) {}
    const fallbacks = {
        enable: true,
        lingeringEffects: true,
        blendModes: true,
        advancedClassification: false,
        skipCuratedSpells: true
    };
    return fallbacks[key];
};

// ============================================================
// 2. CORE CONFIGURATION & DICTIONARIES
// ============================================================
const ASSET_CACHE = new Map();

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
    void: { color: "dark_purple", trait: "negative" },
    death: { color: "dark_purple", trait: "negative" },
    poison: { color: "green", trait: "poison" },
    toxic: { color: "green", trait: "poison" }
};

const EXPLICIT_DATABASE_MAP = {
    castRing: [
        "jb2a.magic_signs.circle.01.abjuration.{color}",
        "jb2a.magic_signs.circle.01.abjuration.blue"
    ],
    groundRing: [
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
        nature:  { ground: "jb2a.entangle.green",    overlay: "jb2a.vines.growth.green" },
        force:   { ground: "jb2a.shattered_earth",  overlay: "jb2a.spectral_chains.standard" },
        default: { ground: "jb2a.magic_signs.circle",overlay: "jb2a.chains.standard" }
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
// 3. SILENT SAFESTOP VALIDATION ENGINE
// ============================================================
function isValidSequencerPath(testPath) {
    if (typeof Sequencer?.Database?.getEntry !== 'function') {
        return false;
    }

    try {
        const entry = Sequencer.Database.getEntry(testPath, { softFail: true });
        if (entry) {
            const rawStringified = JSON.stringify(entry);
            if (rawStringified.includes(':""') || rawStringified.includes(':\\"\\"') || !rawStringified.includes('.webm')) {
                return false;
            }
            if (entry.file !== undefined || entry.children !== undefined) {
                return true;
            }
        }
    } catch (error) {}

    return false;
}

function resolveVerifiedAssetPath(assetType, preferredColor) {
    const cacheKey = `${assetType}-${preferredColor}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    if (typeof Sequencer?.Database?.getEntry !== 'function') {
        return null;
    }

    const structuralPatterns = EXPLICIT_DATABASE_MAP[assetType] || [];

    for (const pattern of structuralPatterns) {
        const testPath = pattern.replace("{color}", preferredColor);
        if (isValidSequencerPath(testPath)) {
            ASSET_CACHE.set(cacheKey, testPath);
            return testPath;
        }
    }

    ASSET_CACHE.set(cacheKey, null);
    return null;
}

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

// Extends resolveVerifiedAssetPath with a final pass through ASSET_FALLBACK_CHAIN
// if the explicit database map produced no match. Always safe: returns null on
// total failure, same as resolveVerifiedAssetPath did before.
function resolveAssetWithFallback(assetType, preferredColor) {
    const direct = resolveVerifiedAssetPath(assetType, preferredColor);
    if (direct) return direct;

    const cacheKey = `fallback-${assetType}-${preferredColor}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const chain = ASSET_FALLBACK_CHAIN[assetType] || [];
    for (const chainFn of chain) {
        const testPath = chainFn(preferredColor);
        if (isValidSequencerPath(testPath)) {
            ASSET_CACHE.set(cacheKey, testPath);
            return testPath;
        }
    }

    ASSET_CACHE.set(cacheKey, null);
    return null;
}

// ============================================================
// 3.1 ENHANCED CLASSIFICATION APPLIER (NEW - Part 1.1, extended Phase B)
// ============================================================
// Non-breaking function that layers classification on top of base config.
// If advancedClassification is disabled, this is a no-op passthrough.
function applyEnhancedClassification(baseConfig, spell, searchString = "") {
    // Early return if feature not enabled
    if (!getSettingSafe("advancedClassification")) {
        return baseConfig;
    }

    // Guard against missing system data
    if (!spell.system) {
        return baseConfig;
    }

    try {
        const traits = spell.system.traits?.value || [];

        // Attempt to detect tradition from traits
        const traditionKey = traits.find(t => ENHANCED_CLASSIFICATION.traditions[t]);
        if (traditionKey) {
            baseConfig.traditionKey = traditionKey;
            baseConfig.traditionCircle = ENHANCED_CLASSIFICATION.traditions[traditionKey];
            console.debug(`PF2e Heuristic | Classification: Tradition detected (${traditionKey})`);
        }

        // Attempt to detect school from traits
        const schoolKey = traits.find(t => ENHANCED_CLASSIFICATION.schools[t]);
        if (schoolKey) {
            baseConfig.schoolKey = schoolKey;
            baseConfig.schoolOverlay = ENHANCED_CLASSIFICATION.schools[schoolKey];
            console.debug(`PF2e Heuristic | Classification: School detected (${schoolKey})`);
        }

        // NEW (Phase B): Keyword-based fallback for tradition/school when
        // traits didn't directly name them (e.g. trait list omits "evocation"
        // but the description clearly describes an evocation effect).
        if (!baseConfig.traditionKey || !baseConfig.schoolKey) {
            for (const [keyword, data] of Object.entries(ENHANCED_KEYWORD_MAP)) {
                const matched = traits.includes(keyword) || searchString.includes(keyword);
                if (!matched) continue;

                if (!baseConfig.traditionKey && data.tradition && ENHANCED_CLASSIFICATION.traditions[data.tradition]) {
                    baseConfig.traditionKey = data.tradition;
                    baseConfig.traditionCircle = ENHANCED_CLASSIFICATION.traditions[data.tradition];
                    console.debug(`PF2e Heuristic | Classification: Tradition detected via keyword "${keyword}" (${data.tradition})`);
                }

                if (!baseConfig.schoolKey && data.school && ENHANCED_CLASSIFICATION.schools[data.school]) {
                    baseConfig.schoolKey = data.school;
                    baseConfig.schoolOverlay = ENHANCED_CLASSIFICATION.schools[data.school];
                    console.debug(`PF2e Heuristic | Classification: School detected via keyword "${keyword}" (${data.school})`);
                }

                if (baseConfig.traditionKey && baseConfig.schoolKey) break;
            }
        }

        // NEW (Phase B): Detect restraint / crowd-control conditions.
        // Informational only for now - intended for a future Phase G
        // persistent-effects system, but harmless to compute and log here.
        const detectedConditions = [];
        for (const [keyword, data] of Object.entries(ENHANCED_KEYWORD_MAP)) {
            if (!data.condition) continue;
            if ((traits.includes(keyword) || searchString.includes(keyword)) && !detectedConditions.includes(data.condition)) {
                detectedConditions.push(data.condition);
            }
        }
        if (detectedConditions.length > 0) {
            baseConfig.detectedConditions = detectedConditions;

            const restraintKey = traits.includes("nature") ? "nature"
                : (traits.includes("force") || searchString.includes("force")) ? "force"
                : "default";
            baseConfig.restraintKey = restraintKey;
            baseConfig.restraintOverlay = ENHANCED_CLASSIFICATION.restraints[restraintKey];
            console.debug(`PF2e Heuristic | Classification: Restraint conditions detected (${detectedConditions.join(", ")}), overlay set: ${restraintKey}`);
        }

        // Log classification attempt for debugging
        if (baseConfig.traditionKey || baseConfig.schoolKey || detectedConditions.length > 0) {
            console.debug(`PF2e Heuristic | Enhanced classification applied to: ${spell.name}`);
        }

    } catch (e) {
        // Fail silently - classification is optional
        console.debug(`PF2e Heuristic | Classification error (non-fatal):`, e.message);
    }

    return baseConfig;
}

// ============================================================
// 3.2 CURATED SPELL SUPPORT (NEW - Part 2 / Phase A)
// ============================================================
// Builds a one-time set of spell slugs that already have hand-crafted
// macros in the "PF2e Animation Macros (JB2A)" module. If a spell is in
// this set, the heuristic engine steps aside so the curated macro
// (triggered by that module's own hooks) is the only animation that plays.
//
// A handful of macros in that pack are admin/utility tools rather than
// spell animations (e.g. "Cone Template", "Export Autorec JSON"). Their
// names are generic enough that a real spell could collide with them, so
// they're excluded from the curated set entirely.
const CURATED_SET_EXCLUDE = new Set([
    "action-counter",
    "add-effect",
    "blacklist-animations",
    "cone-template",
    "cone-hands",
    "dismiss-selected-token",
    "export-autorec-json",
    "open-aa",
    "persistent-conditions",
    "variable-templates",
    "mirror-reflection-animation",
    "opacity-1"
]);

function getCuratedSpellSet() {
    if (globalThis._CURATED_SPELL_CACHE) return globalThis._CURATED_SPELL_CACHE;

    const slugs = new Set();
    try {
        const macroModule = game.modules?.get("pf2e-jb2a-macros");
        if (macroModule?.active) {
            for (const pack of game.packs) {
                if (pack.metadata?.packageName !== "pf2e-jb2a-macros") continue;
                if (pack.metadata?.type !== "Macro") continue;

                for (const entry of pack.index) {
                    const name = entry.name;
                    if (!name) continue;
                    const slug = typeof name.slugify === "function"
                        ? name.slugify({ strict: true })
                        : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    if (slug && !CURATED_SET_EXCLUDE.has(slug)) slugs.add(slug);
                }
            }
        }
    } catch (e) {
        console.warn("PF2e Heuristic | Curated spell pack unavailable:", e.message);
    }

    globalThis._CURATED_SPELL_CACHE = slugs;
    return slugs;
}

// ============================================================
// 4. PARSING ENGINE
// ============================================================
function parseSpellToAnimation(spell) {
    // NEW (Phase A): Defer to curated macros for known spells
    if (getSettingSafe("skipCuratedSpells")) {
        const curatedSet = getCuratedSpellSet();
        if (curatedSet.size > 0) {
            const spellSlug = spell.slug || (typeof spell.name?.slugify === "function"
                ? spell.name.slugify({ strict: true })
                : (spell.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));

            if (spellSlug && curatedSet.has(spellSlug)) {
                return { type: "CURATED_SPELL", spellSlug, originalSpellName: spell.name };
            }
        }
    }

    const searchString = `${spell.name} ${spell.system?.description?.value || ""}`.toLowerCase();
    let config = {
        color: "blue",
        type: "projectile",
        blend: false
    };

    for (const [keyword, data] of Object.entries(KEYWORD_MAP)) {
        if (searchString.includes(keyword)) {
            config.color = data.color;
            if (["fire", "electricity", "sonic", "force"].includes(data.trait)) {
                config.blend = getSettingSafe("blendModes");
            }
            break;
        }
    }

    if (searchString.includes("burst") || searchString.includes("emanation") || searchString.includes("radius") || searchString.includes("splash")) {
        config.type = "burst";
    } else if (searchString.includes("touch") || searchString.includes("melee strike")) {
        config.type = "melee";
    } else if (searchString.includes("target yourself") || searchString.includes("buff") || searchString.includes("healing")) {
        config.type = "utility";
    }

    config.castRing   = resolveAssetWithFallback("castRing", config.color);
    config.groundRing = resolveAssetWithFallback("groundRing", config.color);
    config.impact     = resolveAssetWithFallback("impact", config.color);
    config.projectile = resolveAssetWithFallback("projectile", config.color);
    config.tokenBuff  = resolveAssetWithFallback("tokenBuff", config.color);

    // NEW (Part 1.1, extended Phase B): Apply enhanced classification layer
    config = applyEnhancedClassification(config, spell, searchString);

    return config;
}

// ============================================================
// 5. RENDERING PIPELINE WITH VERIFICATION LOGGING
// ============================================================
async function executeHeuristicAnimation(spell, token) {
    if (!token || !canvas.tokens?.placeables.includes(token)) return;

    const SequenceClass = typeof Sequence !== 'undefined' ? Sequence : game.modules.get("sequencer")?.api?.Sequence;
    if (!SequenceClass) return;

    const animationConfig = parseSpellToAnimation(spell);

    // NEW (Phase A): Step aside for spells with a curated macro
    if (animationConfig.type === "CURATED_SPELL") {
        console.log(
            `%cPF2E HEURISTIC | Curated macro exists for "${animationConfig.originalSpellName}" (slug: ${animationConfig.spellSlug}) - skipping heuristic animation.`,
            "color: #99ff99; font-weight: bold;"
        );
        return;
    }

    const targets = Array.from(game.user.targets).filter(t => t && canvas.tokens?.placeables.includes(t));
    let seq = new SequenceClass();

    // PRINT ALL CHOSEN TAGS BEFORE SENDING TO SEQUENCER
    console.log(
        `%cPF2E HEURISTIC | TARGET DATABASE TAGS SELECTED:\n` +
        `%c  • Cast Ring:    "${animationConfig.castRing}"\n` +
        `%c  • Projectile:  "${animationConfig.projectile}"\n` +
        `%c  • Impact:      "${animationConfig.impact}"\n` +
        `%c  • Ground Ring: "${animationConfig.groundRing}"\n` +
        `%c  • Token Buff:  "${animationConfig.tokenBuff}"`,
        "color: #ffaa00; font-weight: bold; font-size: 11px;",
        animationConfig.castRing ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.projectile ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.impact ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.groundRing ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.tokenBuff ? "color: #00ff66;" : "color: #ff3333;"
    );

    // NEW (Part 1.1, extended Phase B): Log classification info if present
    if (animationConfig.traditionCircle || animationConfig.schoolOverlay || animationConfig.detectedConditions?.length) {
        console.log(
            `%cPF2E HEURISTIC | ENHANCED CLASSIFICATION:\n` +
            `%c  • Tradition: ${animationConfig.traditionKey || "none"}\n` +
            `%c  • School: ${animationConfig.schoolKey || "none"}\n` +
            `%c  • Conditions: ${animationConfig.detectedConditions?.length ? animationConfig.detectedConditions.join(", ") : "none"}`,
            "color: #99ff99; font-weight: bold;",
            animationConfig.traditionCircle ? "color: #00ff99;" : "color: #666666;",
            animationConfig.schoolOverlay ? "color: #00ff99;" : "color: #666666;",
            animationConfig.detectedConditions?.length ? "color: #00ff99;" : "color: #666666;"
        );
    }

    // PHASE 1: Casting Origin Elements
    if (animationConfig.castRing) {
        console.log(`%c[DEPLOYING] Cast Ring -> .file("${animationConfig.castRing}")`, "color: #00ccff;");
        seq.effect()
            .file(animationConfig.castRing)
            .atLocation(token)
            .size(token.document.width * 2, { gridUnits: true })
            .fadeIn(200)
            .fadeOut(500)
            .waitUntilFinished(-300);
    }

    // PHASE 2: Tactical Routing Traversal (Projectiles)
    if (animationConfig.type === "projectile" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.projectile) {
                console.log(`%c[DEPLOYING] Projectile -> .file("${animationConfig.projectile}") to target: ${target.name}`, "color: #00ccff;");
                let effectElement = seq.effect()
                    .file(animationConfig.projectile)
                    .atLocation(token)
                    .stretchTo(target)
                    .missed(false)
                    .name(`projectile_${spell.slug}_${target.id}`);

                if (animationConfig.blend) effectElement.blendMode("ADD");
            }

            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Impact -> .file("${animationConfig.impact}") on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(200);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }

            if (getSettingSafe("lingeringEffects") && animationConfig.groundRing) {
                console.log(`%c[DEPLOYING] Lingering Ring -> .file("${animationConfig.groundRing}") on target: ${target.name}`, "color: #00ccff;");
                seq.effect()
                    .file(animationConfig.groundRing)
                    .atLocation(target)
                    .size(target.document.width * 1.2, { gridUnits: true })
                    .duration(2500)
                    .fadeIn(400)
                    .fadeOut(600);
            }
        }
    } 
    // PHASE 3: Melee / Touch Pipeline (RESTORED)
    else if (animationConfig.type === "melee" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Melee Impact -> .file("${animationConfig.impact}") on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // PHASE 4: Burst / Emanation / Splash Pipeline (DYNAMIC CENTER FIXED)
    else if (animationConfig.type === "burst") {
        const burstCenter = targets.length > 0 ? targets[0] : token;

        if (animationConfig.groundRing) {
            console.log(`%c[DEPLOYING] Burst Ground Ring -> .file("${animationConfig.groundRing}")`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.groundRing)
                .atLocation(burstCenter)
                .size(4, { gridUnits: true }) 
                .duration(3000)
                .fadeIn(300)
                .fadeOut(800);
        }

        if (targets.length > 0) {
            for (const target of targets) {
                if (animationConfig.impact) {
                    console.log(`%c[DEPLOYING] Burst Impact -> .file("${animationConfig.impact}") on target: ${target.name}`, "color: #00ccff;");
                    let impactElement = seq.effect()
                        .file(animationConfig.impact)
                        .atLocation(target)
                        .size(target.document.width * 1.5, { gridUnits: true });

                    if (animationConfig.blend) impactElement.blendMode("ADD");
                }
            }
        } else {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Burst Impact (Self Fallback) -> .file("${animationConfig.impact}")`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impact)
                    .atLocation(token)
                    .size(3, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    } 
    // PHASE 5: Utility / Personal Buff Route
    else {
        if (animationConfig.tokenBuff) {
            console.log(`%c[DEPLOYING] Token Buff -> .file("${animationConfig.tokenBuff}")`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.tokenBuff)
                .atLocation(token)
                .size(token.document.width * 1.2, { gridUnits: true })
                .duration(4000)
                .fadeIn(500)
                .fadeOut(500)
                .tieToToken();
        }
    }

    console.log(`%c[SEQUENCER] Handing pipeline off to canvas execution engine.`, "color: #9900ff; font-weight: bold;");
    seq.play();
}

// ============================================================
// 6. CHAT INTERCEPT HOOK
// ============================================================
Hooks.off("createChatMessage", globalThis._pf2eHeuristicHookId);

globalThis._pf2eHeuristicHookId = Hooks.on("createChatMessage", (message, options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;

    ASSET_CACHE.clear();

    setTimeout(async () => {
        let spellName = "";
        
        if (message.flavor) {
            spellName = message.flavor;
        } else if (message.content) {
            const doc = new DOMParser().parseFromString(message.content, 'text/html');
            const header = doc.querySelector('.chat-card h3, h3, .item-name, .action strong');
            if (header) {
                spellName = header.textContent.trim();
            } else {
                spellName = doc.body.textContent.split('\n')[0].trim();
            }
        }

        if (spellName) spellName = spellName.replace(/\s+\d+$/, "");
        if (!spellName || spellName.length > 50) return;
        const lowerName = spellName.toLowerCase();
        
        if (lowerName.includes("strike") || lowerName.includes("attack") || lowerName.includes("saving throw")) return;

        const token = message.actor?.getActiveTokens()[0] || canvas.tokens.controlled[0];
        if (!token) return;

        const mockSpell = {
            name: spellName,
            slug: spellName.slugify({camel: false}),
            system: {
                description: { value: message.content || "" },
                traits: { value: [] }
            }
        };

        console.log(`%cPF2E HEURISTIC %c| Instantiating Canvas Sequence for: "${spellName}"`, "color: #00ffcc; font-weight: bold;", "color: #ffffff;");
        executeHeuristicAnimation(mockSpell, token);
    }, 200);
});

console.log("PF2e Heuristic Fallback Engine | Version 7.1.1+ Enhanced (Classification Layer + Asset Fallback Chains + Curated Spell Support + Enhanced Keyword Classification)");
