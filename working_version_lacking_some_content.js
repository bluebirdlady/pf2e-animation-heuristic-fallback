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
 *
 * Phase C: Random animation variants
 * - resolveAssetVariants() collects every EXPLICIT_DATABASE_MAP pattern for
 *   an asset type/color that resolves to a valid Sequencer entry
 * - When "randomVariants" is enabled and 2+ variants exist, config gets a
 *   `<assetType>Variants` array; .file() is called with that array so
 *   Sequencer picks one at random per cast
 * - Default off; with 0-1 variants (the common case), behavior is identical
 *   to before this phase
 *
 * Phase D: Concurrency protection
 * - activeSequences tracks how many heuristic animation sequences are
 *   currently mid-flight (incremented/decremented around the full
 *   sequence build + seq.play())
 * - "maxConcurrentAnimations" (default 4, range 1-16) caps how many can run
 *   at once; additional casts are skipped (not queued) once the cap is hit
 * - seq.play() is now awaited so the counter accurately reflects in-progress
 *   playback, not just sequence construction
 *
 * Bugfix: PHASE 5 (Token Buff route) called the non-existent Sequencer
 * method .tieToToken(); replaced with the correct .attachTo(token).
 *
 * Phase E: Configuration caching
 * - CONFIG_CACHE memoizes parseSpellToAnimation() results per spell
 *   (keyed by uuid/id/name), so repeat casts skip re-parsing/re-classifying
 * - Gated behind "enableConfigCache" (default on); when off, behavior is
 *   identical to before this phase
 * - Cache auto-clears once it exceeds CONFIG_CACHE_LIMIT (500) entries
 *
 * Phase F: Template placement handling
 * - listenForTemplatePlacement() waits (up to 5s) for the player to place a
 *   measured template, resolving with the template or null on timeout
 * - For "burst"-type animations on spells with an area (spell.system.area),
 *   the ground ring/impact center on the placed template's position when
 *   available, falling back to target/self positioning otherwise
 * - Gated behind "useTemplateHandling" (default off); when off, behavior is
 *   identical to before this phase
 *
 * Phase G: Persistent crowd-control effects (beta, opt-in)
 * - createItem/deleteItem hooks watch for restraint conditions (immobilized,
 *   restrained, paralyzed, grabbed) and attach/remove a looping overlay
 *   effect on the affected token via Sequencer's .persist()
 * - Effects are named "restraint-{tokenId}-{slug}" for reliable cleanup;
 *   a deleteToken hook fail-safes any lingering effects on token removal
 * - Gated behind "enableCCEffects" (default off); every hook handler is
 *   wrapped in try/catch so failures here are non-fatal and never affect
 *   the rest of the module
 * - resolveCCOverlay() picks the first valid overlay from
 *   CC_OVERLAY_CANDIDATES (memoized) as defense-in-depth in case an
 *   overlay path is unavailable in a given JB2A install
 *
 * Bugfix: ENHANCED_CLASSIFICATION.restraints overlay paths referenced
 * non-existent JB2A assets ("jb2a.chains.standard",
 * "jb2a.spectral_chains.standard", "jb2a.vines.growth.green"). Replaced
 * with valid looping assets (jb2a.markers.chain.diamond.loop.01.grey/purple,
 * jb2a.entangle.02.loop.02.green) suitable for persist().
 *
 * Phase H: Elemental area shapes + expanded element coverage
 * - parseSpellToAnimation() now checks spell.system.traits.value for a
 *   KEYWORD_MAP match before falling back to description-string search,
 *   which is more reliable than text matching
 * - KEYWORD_MAP expanded to cover the full PF2e damage/alignment trait set
 *   (mental, vitality/positive/radiant, chaotic, evil, good, lawful, bleed,
 *   negative)
 * - For spells with area.type "cone" or "line", resolveElementalAreaAsset()
 *   picks an element-specific JB2A breath-weapon effect (fire/cold/acid/
 *   lightning/poison) when available; new "cone"/"line" pipelines render it
 *   rotated/stretched toward a placed template or the first target
 * - If no elemental area asset matches (e.g. mental, force), the spell falls
 *   back to its previously-determined type (burst/projectile/etc) -
 *   completely unchanged behavior for those spells
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
    safeRegister("randomVariants", {
        name: "Use Random Animation Variants",
        hint: "When multiple matching JB2A animations exist for a spell's color/type, randomly pick among them for visual variety.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    safeRegister("maxConcurrentAnimations", {
        name: "Max Concurrent Animations",
        hint: "Limit how many heuristic animation sequences can play at once. Additional casts are skipped (not queued) until one finishes.",
        scope: "client",
        config: true,
        type: Number,
        range: { min: 1, max: 16, step: 1 },
        default: 4
    });
    safeRegister("enableConfigCache", {
        name: "Enable Configuration Cache",
        hint: "Cache spell parsing results for performance (disable if you encounter stale data).",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    safeRegister("useTemplateHandling", {
        name: "Enable Template Placement Handling",
        hint: "For area spells (burst/cone/line/emanation), briefly wait for you to place a measurement template and center the animation on it.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    safeRegister("enableCCEffects", {
        name: "Enable Persistent Crowd-Control Effects (Beta)",
        hint: "Show a looping overlay effect on tokens afflicted with restraint conditions (immobilized, restrained, paralyzed, grabbed), removed automatically when the condition ends.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
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
        skipCuratedSpells: true,
        randomVariants: false,
        maxConcurrentAnimations: 4,
        enableConfigCache: true,
        useTemplateHandling: false,
        enableCCEffects: false
    };
    return fallbacks[key];
};

// ============================================================
// 2. CORE CONFIGURATION & DICTIONARIES
// ============================================================
const ASSET_CACHE = new Map();

// NEW (Phase E): Caches parseSpellToAnimation() results per spell so the same
// spell isn't re-parsed/re-classified on every cast. Cleared once it grows
// past CONFIG_CACHE_LIMIT entries to avoid unbounded growth.
const CONFIG_CACHE = new Map();
const CONFIG_CACHE_LIMIT = 500;

// NEW (Phase D): Tracks how many heuristic animation sequences are currently
// in flight, so a flurry of casts can't pile up unbounded Sequencer work.
let activeSequences = 0;

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
    mental: { color: "pink", trait: "mental" },
    psychic: { color: "pink", trait: "mental" },
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
// 3.2 RANDOM ANIMATION VARIANTS (NEW - Phase C)
// ============================================================
// Collects every EXPLICIT_DATABASE_MAP pattern for an asset type/color that
// resolves to a valid Sequencer entry, for use as a randomization pool.
// Only consulted when "randomVariants" is enabled; resolveAssetWithFallback()
// remains the single-path source of truth otherwise.
function resolveAssetVariants(assetType, preferredColor) {
    const cacheKey = `variants-${assetType}-${preferredColor}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const variants = [];
    const structuralPatterns = EXPLICIT_DATABASE_MAP[assetType] || [];

    for (const pattern of structuralPatterns) {
        const testPath = pattern.replace("{color}", preferredColor);
        if (!variants.includes(testPath) && isValidSequencerPath(testPath)) {
            variants.push(testPath);
        }
    }

    ASSET_CACHE.set(cacheKey, variants);
    return variants;
}

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

// Resolves a validated elemental cone/line asset for the given element trait,
// memoized in ASSET_CACHE. Returns null if no matching/valid asset exists.
function resolveElementalAreaAsset(elementTrait, shape) {
    if (!elementTrait || !shape) return null;

    const cacheKey = `elemArea-${elementTrait}-${shape}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const candidate = ELEMENTAL_AREA_ASSETS[elementTrait]?.[shape] || null;
    const result = (candidate && isValidSequencerPath(candidate)) ? candidate : null;

    ASSET_CACHE.set(cacheKey, result);
    return result;
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
    // NEW (Phase E): Return a cached config if this spell was already parsed.
    const enableConfigCache = getSettingSafe("enableConfigCache");
    const configCacheKey = spell?.uuid || spell?.id || spell?.name;
    if (enableConfigCache && configCacheKey && CONFIG_CACHE.has(configCacheKey)) {
        return CONFIG_CACHE.get(configCacheKey);
    }

    // NEW (Phase A): Defer to curated macros for known spells
    if (getSettingSafe("skipCuratedSpells")) {
        const curatedSet = getCuratedSpellSet();
        if (curatedSet.size > 0) {
            const spellSlug = spell.slug || (typeof spell.name?.slugify === "function"
                ? spell.name.slugify({ strict: true })
                : (spell.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));

            if (spellSlug && curatedSet.has(spellSlug)) {
                const curatedConfig = { type: "CURATED_SPELL", spellSlug, originalSpellName: spell.name };
                if (enableConfigCache && configCacheKey) {
                    cacheParsedConfig(configCacheKey, curatedConfig);
                }
                return curatedConfig;
            }
        }
    }

    const searchString = `${spell.name} ${spell.system?.description?.value || ""}`.toLowerCase();
    let config = {
        color: "blue",
        type: "projectile",
        blend: false
    };

    // NEW (Phase H): Prefer the spell's structured damage/alignment traits
    // (e.g. "fire", "mental", "vitality") over description-string matching,
    // since traits are reliable PF2e taxonomy and description text can be
    // misleading (e.g. flavor text mentioning an unrelated element).
    const spellTraits = (spell.system?.traits?.value || []).map(t => String(t).toLowerCase());
    let matchedKeyword = null;
    for (const trait of spellTraits) {
        if (KEYWORD_MAP[trait]) {
            matchedKeyword = trait;
            break;
        }
    }

    if (!matchedKeyword) {
        for (const keyword of Object.keys(KEYWORD_MAP)) {
            if (searchString.includes(keyword)) {
                matchedKeyword = keyword;
                break;
            }
        }
    }

    if (matchedKeyword) {
        const data = KEYWORD_MAP[matchedKeyword];
        config.color = data.color;
        config.elementTrait = data.trait;
        if (["fire", "electricity", "sonic", "force"].includes(data.trait)) {
            config.blend = getSettingSafe("blendModes");
        }
    }

    if (searchString.includes("burst") || searchString.includes("emanation") || searchString.includes("radius") || searchString.includes("splash")) {
        config.type = "burst";
    } else if (searchString.includes("touch") || searchString.includes("melee strike")) {
        config.type = "melee";
    } else if (searchString.includes("target yourself") || searchString.includes("buff") || searchString.includes("healing")) {
        config.type = "utility";
    }

    // NEW (Phase H): For cone/line area spells, prefer an element-specific
    // breath-weapon asset over the generic burst/projectile pipeline. Falls
    // back to the type determined above if no matching asset is available
    // (e.g. mental cones, which have no JB2A breath-weapon equivalent).
    const areaShape = spell.system?.area?.type;
    if (areaShape === "cone" || areaShape === "line") {
        const areaEffect = resolveElementalAreaAsset(config.elementTrait, areaShape);
        if (areaEffect) {
            config.type = areaShape;
            config.areaEffect = areaEffect;
        }
    }

    config.castRing   = resolveAssetWithFallback("castRing", config.color);
    config.groundRing = resolveAssetWithFallback("groundRing", config.color);
    config.impact     = resolveAssetWithFallback("impact", config.color);
    config.projectile = resolveAssetWithFallback("projectile", config.color);
    config.tokenBuff  = resolveAssetWithFallback("tokenBuff", config.color);

    // NEW (Phase C): When enabled, gather variant pools for visual variety.
    // Only attached when 2+ valid options exist; rendering falls back to the
    // single resolved path above otherwise.
    if (getSettingSafe("randomVariants")) {
        for (const assetType of ["castRing", "groundRing", "impact", "projectile", "tokenBuff"]) {
            const variants = resolveAssetVariants(assetType, config.color);
            if (variants.length > 1) {
                config[`${assetType}Variants`] = variants;
            }
        }
    }

    // NEW (Part 1.1, extended Phase B): Apply enhanced classification layer
    config = applyEnhancedClassification(config, spell, searchString);

    // NEW (Phase E): Cache the parsed config for future casts of this spell
    if (enableConfigCache && configCacheKey) {
        cacheParsedConfig(configCacheKey, config);
    }

    return config;
}

// NEW (Phase E): Stores a parsed config in CONFIG_CACHE, clearing the whole
// cache first if it has grown past CONFIG_CACHE_LIMIT entries.
function cacheParsedConfig(key, config) {
    if (CONFIG_CACHE.size >= CONFIG_CACHE_LIMIT) {
        CONFIG_CACHE.clear();
        console.debug(`PF2e Heuristic | Config cache cleared (size limit of ${CONFIG_CACHE_LIMIT} reached)`);
    }
    CONFIG_CACHE.set(key, config);
}

// NEW (Phase F): Waits briefly for the player to place a measured template
// (e.g. for a burst/cone spell), resolving with the template placeable, or
// null if none is placed before the timeout. Never throws.
function listenForTemplatePlacement(timeoutMs = 5000) {
    return new Promise((resolve) => {
        let hookId = null;
        let timer = null;

        const cleanup = () => {
            if (hookId !== null) Hooks.off("createMeasuredTemplate", hookId);
            if (timer !== null) clearTimeout(timer);
        };

        hookId = Hooks.once("createMeasuredTemplate", (templateDoc) => {
            cleanup();
            console.debug("PF2e Heuristic | Template placement detected");
            resolve(templateDoc.object);
        });

        timer = setTimeout(() => {
            cleanup();
            console.debug("PF2e Heuristic | Template placement timeout - using fallback positioning");
            resolve(null);
        }, timeoutMs);
    });
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

    // NEW (Phase D): Concurrency protection - if too many sequences are
    // already in flight, skip this one rather than piling on more canvas work.
    const maxConcurrent = getSettingSafe("maxConcurrentAnimations") || 4;
    if (activeSequences >= maxConcurrent) {
        console.debug(`PF2e Heuristic | Max concurrent animations (${maxConcurrent}) reached - skipping animation for "${spell.name}".`);
        return;
    }

    const targets = Array.from(game.user.targets).filter(t => t && canvas.tokens?.placeables.includes(t));

    // NEW (Phase F): For burst/area spells, optionally wait for the player to
    // place a measured template and center the animation on it. Opt-in,
    // times out after 5s, and falls back to target/self positioning if no
    // template is placed (or the spell has no area).
    let areaTemplate = null;
    if (getSettingSafe("useTemplateHandling") && ["burst", "cone", "line"].includes(animationConfig.type) && spell.system?.area?.type) {
        console.debug(`PF2e Heuristic | Awaiting template placement for "${spell.name}"...`);
        areaTemplate = await listenForTemplatePlacement(5000);
    }

    let seq = new SequenceClass();

    // NEW (Phase D): Bracket the entire sequence-building/playback lifecycle
    // so the in-flight counter is always decremented, even on error.
    activeSequences++;
    try {

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
        console.log(`%c[DEPLOYING] Cast Ring -> .file(${animationConfig.castRingVariants ? `[${animationConfig.castRingVariants.length} variants]` : `"${animationConfig.castRing}"`})`, "color: #00ccff;");
        seq.effect()
            .file(animationConfig.castRingVariants || animationConfig.castRing)
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
                console.log(`%c[DEPLOYING] Projectile -> .file(${animationConfig.projectileVariants ? `[${animationConfig.projectileVariants.length} variants]` : `"${animationConfig.projectile}"`}) to target: ${target.name}`, "color: #00ccff;");
                let effectElement = seq.effect()
                    .file(animationConfig.projectileVariants || animationConfig.projectile)
                    .atLocation(token)
                    .stretchTo(target)
                    .missed(false)
                    .name(`projectile_${spell.slug}_${target.id}`);

                if (animationConfig.blend) effectElement.blendMode("ADD");
            }

            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(200);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }

            if (getSettingSafe("lingeringEffects") && animationConfig.groundRing) {
                console.log(`%c[DEPLOYING] Lingering Ring -> .file(${animationConfig.groundRingVariants ? `[${animationConfig.groundRingVariants.length} variants]` : `"${animationConfig.groundRing}"`}) on target: ${target.name}`, "color: #00ccff;");
                seq.effect()
                    .file(animationConfig.groundRingVariants || animationConfig.groundRing)
                    .atLocation(target)
                    .size(target.document.width * 1.2, { gridUnits: true })
                    .duration(2500)
                    .fadeIn(400)
                    .fadeOut(600);
            }
        }
    }
    // NEW (Phase H): Cone Pipeline - element-specific breath-weapon cone,
    // rotated toward a placed template or the first target if available.
    else if (animationConfig.type === "cone" && animationConfig.areaEffect) {
        const coneTarget = areaTemplate || (targets.length > 0 ? targets[0] : null);

        console.log(`%c[DEPLOYING] Cone -> .file("${animationConfig.areaEffect}")`, "color: #00ccff;");
        let coneElement = seq.effect()
            .file(animationConfig.areaEffect)
            .atLocation(token);

        if (coneTarget) coneElement.rotateTowards(coneTarget);
        if (animationConfig.blend) coneElement.blendMode("ADD");

        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Cone Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(400);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // NEW (Phase H): Line Pipeline - element-specific breath-weapon line,
    // stretched from the caster to a placed template or the first target.
    else if (animationConfig.type === "line" && animationConfig.areaEffect) {
        const lineTarget = areaTemplate || (targets.length > 0 ? targets[0] : null);

        console.log(`%c[DEPLOYING] Line -> .file("${animationConfig.areaEffect}")`, "color: #00ccff;");
        let lineElement = seq.effect()
            .file(animationConfig.areaEffect)
            .atLocation(token);

        if (lineTarget) lineElement.stretchTo(lineTarget);
        if (animationConfig.blend) lineElement.blendMode("ADD");

        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Line Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(400);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // PHASE 3: Melee / Touch Pipeline (RESTORED)
    else if (animationConfig.type === "melee" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Melee Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // PHASE 4: Burst / Emanation / Splash Pipeline (DYNAMIC CENTER FIXED)
    else if (animationConfig.type === "burst") {
        // NEW (Phase F): Prefer a player-placed template's position, falling
        // back to the original target/self centering when none is available.
        const burstCenter = areaTemplate || (targets.length > 0 ? targets[0] : token);

        if (areaTemplate) {
            console.log(`%c[PHASE F] Centering burst on placed template at (${areaTemplate.position?.x}, ${areaTemplate.position?.y})`, "color: #00ccff;");
        }

        if (animationConfig.groundRing) {
            console.log(`%c[DEPLOYING] Burst Ground Ring -> .file(${animationConfig.groundRingVariants ? `[${animationConfig.groundRingVariants.length} variants]` : `"${animationConfig.groundRing}"`})`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.groundRingVariants || animationConfig.groundRing)
                .atLocation(burstCenter)
                .size(4, { gridUnits: true })
                .duration(3000)
                .fadeIn(300)
                .fadeOut(800);
        }

        if (targets.length > 0) {
            for (const target of targets) {
                if (animationConfig.impact) {
                    console.log(`%c[DEPLOYING] Burst Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                    let impactElement = seq.effect()
                        .file(animationConfig.impactVariants || animationConfig.impact)
                        .atLocation(target)
                        .size(target.document.width * 1.5, { gridUnits: true });

                    if (animationConfig.blend) impactElement.blendMode("ADD");
                }
            }
        } else {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Burst Impact (Self Fallback) -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`})`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(burstCenter)
                    .size(3, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    } 
    // PHASE 5: Utility / Personal Buff Route
    else {
        if (animationConfig.tokenBuff) {
            console.log(`%c[DEPLOYING] Token Buff -> .file(${animationConfig.tokenBuffVariants ? `[${animationConfig.tokenBuffVariants.length} variants]` : `"${animationConfig.tokenBuff}"`})`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.tokenBuffVariants || animationConfig.tokenBuff)
                .atLocation(token)
                .size(token.document.width * 1.2, { gridUnits: true })
                .duration(4000)
                .fadeIn(500)
                .fadeOut(500)
                .attachTo(token);
        }
    }

    console.log(`%c[SEQUENCER] Handing pipeline off to canvas execution engine.`, "color: #9900ff; font-weight: bold;");
    await seq.play();
    } finally {
        activeSequences--;
    }
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

// ============================================================
// 7. PERSISTENT CROWD-CONTROL EFFECTS (NEW - Phase G, opt-in/beta)
// ============================================================
// Attaches a small looping overlay to a token while it has a restraint/CC
// condition, removing it again when the condition ends. Entirely gated
// behind "enableCCEffects" (default off). Every operation is wrapped in
// try/catch so a failure here can never break the rest of the module.
const CC_SLUGS = ["immobilized", "restrained", "paralyzed", "grabbed"];

// NEW (Phase G): Candidate overlays for the CC restraint effect, in order of
// preference. Not every JB2A install (free vs Patreon) has all of these, so
// the first one that validates against the Sequencer Database is used.
const CC_OVERLAY_CANDIDATES = [
    ENHANCED_CLASSIFICATION.restraints.default.overlay,
    ENHANCED_CLASSIFICATION.restraints.force.overlay,
    ENHANCED_CLASSIFICATION.restraints.nature.overlay,
    "jb2a.energy_field.02.above.purple"
];

function ccEffectName(tokenId, slug) {
    return `restraint-${tokenId}-${slug}`;
}

// NEW (Phase G): Resolves the first valid CC overlay path, memoized in
// ASSET_CACHE. Returns null if none of the candidates are valid.
function resolveCCOverlay() {
    const cacheKey = "ccOverlay";
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const overlay = CC_OVERLAY_CANDIDATES.find(path => isValidSequencerPath(path)) || null;
    ASSET_CACHE.set(cacheKey, overlay);
    return overlay;
}

function applyCCEffect(token, slug) {
    try {
        if (!getSettingSafe("enableCCEffects")) return;

        const SequenceClass = typeof Sequence !== 'undefined' ? Sequence : game.modules.get("sequencer")?.api?.Sequence;
        if (!SequenceClass || !token) return;

        const overlay = resolveCCOverlay();
        if (!overlay) {
            console.debug(`PF2e Heuristic | No valid CC overlay asset found - skipping effect for "${slug}"`);
            return;
        }

        console.debug(`PF2e Heuristic | Applying persistent CC effect "${slug}" to token "${token.name}"`);

        new SequenceClass()
            .effect()
            .file(overlay)
            .attachTo(token)
            .persist()
            .name(ccEffectName(token.document.id, slug))
            .fadeIn(300)
            .fadeOut(300)
            .play()
            .catch(e => console.debug(`PF2e Heuristic | CC effect playback interrupted (non-fatal): ${e}`));
    } catch (e) {
        console.error("PF2e Heuristic | CC creation error (non-fatal):", e);
    }
}

function clearCCEffect(token, slug) {
    try {
        const SequencerAPI = typeof Sequencer !== 'undefined' ? Sequencer : game.modules.get("sequencer")?.api;
        if (!SequencerAPI?.EffectManager || !token) return;

        console.debug(`PF2e Heuristic | Clearing persistent CC effect "${slug}" from token "${token.name}"`);
        SequencerAPI.EffectManager.endEffects({ name: ccEffectName(token.document.id, slug) });
    } catch (e) {
        console.error("PF2e Heuristic | CC deletion error (non-fatal):", e);
    }
}

// NEW (Phase G): Fail-safe cleanup - removes any lingering CC overlays for a
// token, e.g. when the token itself is deleted from the scene.
function clearAllCCEffectsForToken(tokenId) {
    try {
        const SequencerAPI = typeof Sequencer !== 'undefined' ? Sequencer : game.modules.get("sequencer")?.api;
        if (!SequencerAPI?.EffectManager || !tokenId) return;

        for (const slug of CC_SLUGS) {
            SequencerAPI.EffectManager.endEffects({ name: ccEffectName(tokenId, slug) });
        }
    } catch (e) {
        console.error("PF2e Heuristic | CC cleanup error (non-fatal):", e);
    }
}

(globalThis._pf2eHeuristicCCHookIds || []).forEach(({ hook, id }) => Hooks.off(hook, id));
globalThis._pf2eHeuristicCCHookIds = [];

globalThis._pf2eHeuristicCCHookIds.push({
    hook: "createItem",
    id: Hooks.on("createItem", (item) => {
        try {
            if (!getSettingSafe("enableCCEffects")) return;
            if (item.type !== "condition" || !CC_SLUGS.includes(item.slug)) return;

            const tokens = item.parent?.getActiveTokens?.() || [];
            for (const token of tokens) {
                applyCCEffect(token, item.slug);
            }
        } catch (e) {
            console.error("PF2e Heuristic | CC creation error (non-fatal):", e);
        }
    })
});

globalThis._pf2eHeuristicCCHookIds.push({
    hook: "deleteItem",
    id: Hooks.on("deleteItem", (item) => {
        try {
            if (!getSettingSafe("enableCCEffects")) return;
            if (item.type !== "condition" || !CC_SLUGS.includes(item.slug)) return;

            const tokens = item.parent?.getActiveTokens?.() || [];
            for (const token of tokens) {
                clearCCEffect(token, item.slug);
            }
        } catch (e) {
            console.error("PF2e Heuristic | CC deletion error (non-fatal):", e);
        }
    })
});

globalThis._pf2eHeuristicCCHookIds.push({
    hook: "deleteToken",
    id: Hooks.on("deleteToken", (tokenDoc) => {
        try {
            if (!getSettingSafe("enableCCEffects")) return;
            clearAllCCEffectsForToken(tokenDoc.id);
        } catch (e) {
            console.error("PF2e Heuristic | CC token-cleanup error (non-fatal):", e);
        }
    })
});

console.log("PF2e Heuristic Fallback Engine | Version 7.1.1+ Enhanced (Classification Layer + Asset Fallback Chains + Curated Spell Support + Enhanced Keyword Classification + Random Variants + Concurrency Protection + Configuration Caching + Template Placement Handling + Persistent CC Effects + Elemental Area Shapes)");
