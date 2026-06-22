// ============================================================
// SETTINGS: Module setting registration and getSettingSafe() accessor.
// Loaded first - no dependencies on other module files.
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
    safeRegister("usePf2eGraphicsAssets", {
        name: "Use PF2e Graphics Asset Overrides",
        hint: "For spells with a hand-curated mapping mined from the PF2e Graphics module, use those JB2A assets instead of the heuristic-derived ones.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    // NEW (Phase K1): Backs the "settings:quality" / "settings:persistent"
    // predicate facts used by the predicate-tree animation resolver.
    safeRegister("animationQualityLevel", {
        name: "Animation Quality Level",
        hint: "Used by predicate-driven animation selection (settings:quality) to pick higher-fidelity effects when set higher. 0 = lowest, 3 = highest.",
        scope: "client",
        config: true,
        type: Number,
        range: { min: 0, max: 3, step: 1 },
        default: 1
    });
    safeRegister("usePersistentAnimations", {
        name: "Allow Persistent Predicate-Driven Animations",
        hint: "Used by predicate-driven animation selection (settings:persistent) to allow effects that loop/persist until manually ended.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    // NEW (Phase K4): Gates the attack-roll/strike animation hook.
    safeRegister("enableStrikeAnimations", {
        name: "Enable Strike Animations (Beta)",
        hint: "Play predicate-driven JB2A animations for weapon strikes (and a small number of attack-roll class/creature abilities) using PF2e Graphics data.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    // NEW (Phase K6): Gates the damage-roll animation hook.
    safeRegister("enableDamageRollAnimations", {
        name: "Enable Damage Roll Animations",
        hint: "Play animations when a damage roll is reported (e.g. electric-arc chain lightning, force barrage missile). Only fires for spells with authored tree entries.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
    // NEW (Phase K5): Gates the saving-throw animation hook.
    safeRegister("enableSaveAnimations", {
        name: "Enable Saving Throw Animations",
        hint: "Play outcome-aware animations when a saving throw result is reported. Only fires for spells with authored tree entries — no heuristic fallback, so no false positives.",
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
        skipCuratedSpells: true,
        randomVariants: false,
        maxConcurrentAnimations: 4,
        enableConfigCache: true,
        useTemplateHandling: false,
        enableCCEffects: false,
        usePf2eGraphicsAssets: true,
        animationQualityLevel: 1,
        usePersistentAnimations: false,
        enableStrikeAnimations: false,
        enableDamageRollAnimations: true,
        enableSaveAnimations: true
    };
    return fallbacks[key];
};
