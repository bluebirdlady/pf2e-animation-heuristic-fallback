/**
 * PF2e Animation Heuristic Fallback Engine (v3.1 Final Release)
 * Robust fallback animation processor designed for Foundry V11/V12 compatibility.
 * Hooks directly into Sequencer & JB2A asset indices.
 */

// Global Performance Caching Layers
const ASSET_CACHE = new Map();
let CURATED_SPELL_SET = null;

const JB2A_DICT = {
    elements: {
        fire:        { key: "fire",          color: "orange",    projectile: "fire_bolt",       impact: "fire" },
        cold:        { key: "ice",           color: "blue",      projectile: "ray_of_frost",    impact: "ice" },
        water:       { key: "liquid",        color: "blue",      projectile: "liquid.stream",   impact: "water" },
        electricity: { key: "lightning",     color: "yellow",    projectile: "witch_bolt",      impact: "lightning" },
        acid:        { key: "acid",          color: "green",     projectile: "spell_projectile",impact: "acid" },
        sonic:       { key: "sound",         color: "purple",    projectile: "soundwave",       impact: "sound" },
        force:       { key: "pulse",         color: "dark_purple",projectile: "magic_missile",   impact: "themed" },
        mental:      { key: "enchantment",   color: "pink",      projectile: "energy_strands",  impact: "themed" },
        poison:      { key: "fumes",         color: "green",     projectile: "spell_projectile",impact: "acid" },
        spirit:      { key: "divine",        color: "bluegold",  projectile: "guiding_bolt",    impact: "themed" },
        void:        { key: "dark",          color: "black",     projectile: "ray_of_frost",    impact: "dark" },
        vitality:    { key: "healing",       color: "bluegold",  projectile: "cure_wounds",     impact: "themed" }
    },
    traditions: {
        arcane: "jb2a.magic_signs.circle.02.enchantment.intro",
        divine: "jb2a.magic_signs.circle.02.abjuration.intro",
        occult: "jb2a.magic_signs.circle.02.necromancy.intro",
        primal: "jb2a.magic_signs.circle.02.conjuration.intro"
    },
    defaults: {
        castRing: "jb2a.magic_signs.circle.02.common.intro.blue",
        impact: "jb2a.impact.themed.blue",
        projectile: "jb2a.spell_projectile.blue"
    }
};

const DAMAGE_PRIORITY = ["fire", "cold", "electricity", "acid", "sonic", "force", "spirit", "void", "vitality", "poison", "water"];

/**
 * Initializes and caches the module's curated macro compendium index for O(1) searches.
 */
function getCuratedSpellSet() {
    if (CURATED_SPELL_SET) return CURATED_SPELL_SET;
    
    // Looks for the parent module name to protect curated hand-written macros
    const macroPack = game.packs.get("pf2e-jb2a-macros.pf2e-jb2a-macros");
    if (!macroPack) return new Set();
    
    CURATED_SPELL_SET = new Set(macroPack.index.map(e => e.slug || e.name.toLowerCase()));
    return CURATED_SPELL_SET;
}

/**
 * Validates asset paths inside the dynamic Sequencer database environment.
 */
function safeGetFile(preferredPath, fallbackPath) {
    if (ASSET_CACHE.has(preferredPath)) return ASSET_CACHE.get(preferredPath);

    try {
        if (typeof Sequencer !== 'undefined') {
            const hasEntry = Sequencer.Database?.hasEntry(preferredPath) || Sequencer.hasFile?.(preferredPath);
            if (hasEntry) {
                ASSET_CACHE.set(preferredPath, preferredPath);
                return preferredPath;
            }
        }
    } catch (e) {
        console.error("PF2e Heuristic Engine | Database validation lookup error: ", e);
    }

    ASSET_CACHE.set(preferredPath, fallbackPath);
    return fallbackPath;
}

/**
 * Evaluates core system metadata arrays to establish systemic visual configurations.
 */
export function parseSpellToAnimation(spell) {
    const system = spell.system;
    const traits = system.traits?.value || [];
    
    let detectedDamage = null;
    const damageEntries = Object.values(system.damage || {});
    if (damageEntries.length > 0) {
        const types = damageEntries.map(d => d.type).filter(Boolean);
        detectedDamage = DAMAGE_PRIORITY.find(p => types.includes(p)) || types[0];
    }

    const themeKey = detectedDamage || traits.find(t => JB2A_DICT.elements[t]);
    const theme = JB2A_DICT.elements[themeKey] || JB2A_DICT.elements.force;

    const traditionKey = traits.find(t => JB2A_DICT.traditions[t]);
    let castRingPath = traditionKey 
        ? `${JB2A_DICT.traditions[traditionKey]}.${theme.color}`
        : `${JB2A_DICT.traditions.arcane}.${theme.color}`;
    castRingPath = safeGetFile(castRingPath, JB2A_DICT.defaults.castRing);

    const areaType = system.area?.type;
    const rangeValue = system.range?.value || "touch";
    let pattern = "ON_TOKEN_TARGET";
    let primaryAsset = "";
    let impactAsset = JB2A_DICT.defaults.impact;

    if (areaType) {
        pattern = areaType === "cone" ? "CONE_AOE" : areaType === "line" ? "LINE_AOE" : "BURST_AOE";
        if (pattern === "CONE_AOE") {
            primaryAsset = traits.includes("fire") ? "jb2a.burning_hands.cone.01" : "jb2a.breath_weapons_v2.cone";
        } else if (pattern === "LINE_AOE") {
            primaryAsset = "jb2a.breath_weapons_v2.line";
        } else {
            primaryAsset = "jb2a.template_circle_outpulse";
        }
        primaryAsset = safeGetFile(`${primaryAsset}.${theme.color}`, `jb2a.template_circle_outpulse.blue`);
    } else if (traits.includes("attack") || rangeValue === "ranged" || parseInt(rangeValue) > 5) {
        pattern = "PROJECTILE_RAY";
        primaryAsset = safeGetFile(`jb2a.${theme.projectile}.${theme.color}`, JB2A_DICT.defaults.projectile);
        impactAsset = safeGetFile(`jb2a.impact.${theme.impact}.${theme.color}`, safeGetFile(`jb2a.impact.themed.${theme.color}`, JB2A_DICT.defaults.impact));
    } else {
        pattern = "ON_TOKEN_TARGET";
        primaryAsset = traits.includes("healing") || traits.includes("vitality") ? "jb2a.healing_generic" : "jb2a.on_token_buff";
        primaryAsset = safeGetFile(`${primaryAsset}.${theme.color}`, `jb2a.on_token_buff.blue`);
    }

    return { pattern, castRingPath, primaryAsset, impactAsset, systemArea: system.area };
}

/**
 * Captures user grid actions via hook interception mechanics during spell cast routines.
 */
function listenForTemplatePlacement(timeoutMs = 3000) {
    return new Promise((resolve) => {
        const hookId = Hooks.once("createMeasuredTemplate", (templateDoc) => {
            clearTimeout(timer);
            resolve(templateDoc.object);
        });
        const timer = setTimeout(() => {
            Hooks.off("createMeasuredTemplate", hookId);
            resolve(null);
        }, timeoutMs);
    });
}

/**
 * Orchestrates physical playback of generated structural components on active canvases.
 */
export async function executeHeuristicAnimation(spell, token) {
    if (!token) return;
    
    const config = parseSpellToAnimation(spell);
    const targets = Array.from(game.user.targets);
    const gridSize = canvas.grid?.size || canvas.dimensions?.size || 100;

    let templatePromise = null;
    if (spell.system.area?.type) {
        templatePromise = listenForTemplatePlacement(3000);
    }

    const seq = new Sequence();

    // Stage 1: Somatic/Verbal Casting Circle
    seq.effect()
        .file(config.castRingPath)
        .atLocation(token)
        .scaleToObject(1.4)
        .waitUntilFinished(-400);

    // Stage 2: Geometric Evaluation Route
    switch (config.pattern) {
        case "PROJECTILE_RAY":
            if (targets.length === 0) break;
            for (let target of targets) {
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(token)
                    .stretchTo(target)
                .effect()
                    .file(config.impactAsset)
                    .atLocation(target)
                    .scaleToObject(1.2);
            }
            break;

        case "CONE_AOE":
        case "BURST_AOE":
            let areaTemplate = templatePromise ? await templatePromise : canvas.templates.active;
            
            if (!areaTemplate && targets.length > 0 && config.systemArea) {
                const target = targets[0];
                const ray = new Ray(token.center, target.center);
                const distancePixels = (config.systemArea.value / 5) * gridSize;
                
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(token.center)
                    .rotate(Math.toDegrees(ray.angle))
                    .size(distancePixels);
            } else if (areaTemplate) {
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(areaTemplate.position)
                    .rotate(areaTemplate.document.direction)
                    .size({
                        width: areaTemplate.document.distance * (gridSize / 5),
                        height: areaTemplate.document.distance * (gridSize / 5)
                    });
            }
            break;

        case "LINE_AOE":
            let lineTemplate = templatePromise ? await templatePromise : canvas.templates.active;
            
            if (!lineTemplate && targets.length > 0 && config.systemArea) {
                // Directional Fallback Projection when template bypasses hooks
                const target = targets[0];
                const ray = new Ray(token.center, target.center);
                const distancePixels = (config.systemArea.value / 5) * gridSize;
                
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(token.center)
                    .stretchTo({
                        x: token.center.x + Math.cos(ray.angle) * distancePixels,
                        y: token.center.y + Math.sin(ray.angle) * distancePixels
                    })
                    .size({ height: gridSize });
            } else if (lineTemplate) {
                const ray = Ray.fromAngle(lineTemplate.position.x, lineTemplate.position.y, Math.toRadians(lineTemplate.document.direction), (lineTemplate.document.distance / 5) * gridSize);
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(lineTemplate.position)
                    .stretchTo({ x: ray.B.x, y: ray.B.y })
                    .size({ height: gridSize });
            }
            break;

        case "ON_TOKEN_TARGET":
            const actualTargets = targets.length > 0 ? targets : [token];
            for (let target of actualTargets) {
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(target)
                    .scaleToObject(1.3);
            }
            break;
    }

    return seq.play();
}

/**
 * Systemic Lifecycle Hooks: Catch and Intercept Chat Message Transmissions
 */
Hooks.on("createChatMessage", async (message, options, userId) => {
    if (userId !== game.user.id) return;
    
    // Safety Fallback Check for Custom Configurations
    const ENABLE_HEURISTIC = game.settings.get("pf2e-heuristic-fallback", "enable") ?? true;
    if (!ENABLE_HEURISTIC) return;
    
    const context = message.flags.pf2e?.context;
    if (context?.type !== "spell-cast") return;

    const spell = await fromUuid(context.item);
    if (!spell) return;

    const spellSlug = spell.slug || spell.system?.slug; 
    const traits = spell.system?.traits?.value || [];

    // Filter A: System Trait Blocking (Bypasses Summons and Companions)
    if (traits.includes("summon") || traits.includes("incarnate")) return;
    
    const HARD_BLACKLIST = ["illusionary-object"]; 
    if (HARD_BLACKLIST.includes(spellSlug)) return;

    // Filter B: Constant-Time Curated Core Compendium Verification Search
    const curatedSet = getCuratedSpellSet();
    if (curatedSet.has(spellSlug) || curatedSet.has(spell.name.toLowerCase())) return;

    // Filter C: Safe Intercept Isolation Check for Automated Animations Rulesets
    if (game.modules.get("automated-animations")?.active) {
        try {
            if (typeof AutomatedAnimations !== 'undefined') {
                const aaMatch = AutomatedAnimations.Registry?.getMatch?.(spell) || AutomatedAnimations.animations?.find?.(e => e.id === spellSlug);
                if (aaMatch) return; 
            }
        } catch (err) {
            console.debug("PF2e Heuristic Engine | Automated Animations checking module bypassed.");
        }
    }

    // Execution Core Deployment Call
    const token = message.actor?.getActiveTokens()[0];
    if (token) {
        console.log(`PF2e Heuristic Engine | Processing dynamic visual fallback layers for: ${spell.name}`);
        executeHeuristicAnimation(spell, token);
    }
});