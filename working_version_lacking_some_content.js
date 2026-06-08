/**
 * PF2e Heuristic Fallback Animation Engine
 * Version: 7.1.1+ Enhanced (With Layered Classification System)
 * 
 * Part 1.1: Added non-breaking enhanced classification layer
 * - Original keyword routing remains fully functional
 * - New classification is opt-in via "advancedClassification" setting
 * - Layers richer spell understanding without replacing existing logic
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
        advancedClassification: false
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
// 3. SILENT SAFESTOP VALIDATION ENGINE
// ============================================================
function resolveVerifiedAssetPath(assetType, preferredColor) {
    const cacheKey = `${assetType}-${preferredColor}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    if (typeof Sequencer?.Database?.getEntry !== 'function') {
        return null;
    }

    const structuralPatterns = EXPLICIT_DATABASE_MAP[assetType] || [];

    for (const pattern of structuralPatterns) {
        const testPath = pattern.replace("{color}", preferredColor);

        try {
            const entry = Sequencer.Database.getEntry(testPath, { softFail: true });
            if (entry) {
                const rawStringified = JSON.stringify(entry);
                if (rawStringified.includes(':""') || rawStringified.includes(':\\"\\"') || !rawStringified.includes('.webm')) {
                    continue;
                }
                if (entry.file !== undefined || entry.children !== undefined) {
                    ASSET_CACHE.set(cacheKey, testPath);
                    return testPath;
                }
            }
        } catch (error) {}
    }

    ASSET_CACHE.set(cacheKey, null);
    return null;
}

// ============================================================
// 3.1 ENHANCED CLASSIFICATION APPLIER (NEW - Part 1.1)
// ============================================================
// Non-breaking function that layers classification on top of base config.
// If advancedClassification is disabled, this is a no-op passthrough.
function applyEnhancedClassification(baseConfig, spell) {
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
        
        // Log classification attempt for debugging
        if (traditionKey || schoolKey) {
            console.debug(`PF2e Heuristic | Enhanced classification applied to: ${spell.name}`);
        }

    } catch (e) {
        // Fail silently - classification is optional
        console.debug(`PF2e Heuristic | Classification error (non-fatal):`, e.message);
    }

    return baseConfig;
}

// ============================================================
// 4. PARSING ENGINE
// ============================================================
function parseSpellToAnimation(spell) {
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

    config.castRing   = resolveVerifiedAssetPath("castRing", config.color);
    config.groundRing = resolveVerifiedAssetPath("groundRing", config.color);
    config.impact     = resolveVerifiedAssetPath("impact", config.color);
    config.projectile = resolveVerifiedAssetPath("projectile", config.color);
    config.tokenBuff  = resolveVerifiedAssetPath("tokenBuff", config.color);

    // NEW (Part 1.1): Apply enhanced classification layer
    config = applyEnhancedClassification(config, spell);

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

    // NEW (Part 1.1): Log classification info if present
    if (animationConfig.traditionCircle || animationConfig.schoolOverlay) {
        console.log(
            `%cPF2E HEURISTIC | ENHANCED CLASSIFICATION:\n` +
            `%c  • Tradition: ${animationConfig.traditionKey || "none"}\n` +
            `%c  • School: ${animationConfig.schoolKey || "none"}`,
            "color: #99ff99; font-weight: bold;",
            animationConfig.traditionCircle ? "color: #00ff99;" : "color: #666666;",
            animationConfig.schoolOverlay ? "color: #00ff99;" : "color: #666666;"
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

console.log("PF2e Heuristic Fallback Engine | Version 7.1.1+ Enhanced (Classification Layer Added)");
