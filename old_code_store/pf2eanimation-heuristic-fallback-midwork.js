/**
 * PF2e Animation Heuristic Fallback Engine (v4.6 Unified Production Build)
 * Feature Set: 
 *   - Deep Description Keyword Parsing (Infers damage types, schools, and conditions)
 *   - Procedural Teleportation Routing (Flash, vanish, snap-to-grid, pop-in)
 *   - Persistent Crowd-Control Restraint Engine (Vines/Chains overlay with dynamic velocity)
 *   - Active Condition Unlinking (Automatically clears visuals when items/conditions drop)
 */

// ============================================================
// 1. MODULE SETTINGS INITIALIZATION
// ============================================================
Hooks.once("init", () => {
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
    safeRegister("randomVariants", {
        name: "Use Random Asset Variants",
        hint: "Add subtle visual variety by randomizing asset suffixes where supported.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
    safeRegister("lingeringEffects", {
        name: "Enable Lingering Elemental Effects",
        hint: "After a projectile hits, add a short-lived effect (burn, frost, spark, etc.).",
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
});

// ============================================================
// 2. GLOBAL CACHING & CONSTANTS
// ============================================================
const ASSET_CACHE = new Map();
let CURATED_SPELL_SET = null;
let activeSequences = 0;
const MAX_CONCURRENT = 4;

const JB2A_DICT = {
    elements: {
        fire:        { key: "fire",          color: "orange",    projectile: "fire_bolt",       impact: "fire",      blend: true },
        cold:        { key: "ice",           color: "blue",      projectile: "ray_of_frost",    impact: "ice",       blend: false },
        water:       { key: "liquid",        color: "blue",      projectile: "liquid.stream",   impact: "water",     blend: false },
        electricity: { key: "lightning",     color: "yellow",    projectile: "witch_bolt",      impact: "lightning", blend: true },
        acid:        { key: "acid",          color: "green",     projectile: "spell_projectile",impact: "acid",      blend: false },
        sonic:       { key: "sound",         color: "purple",    projectile: "soundwave",       impact: "sound",     blend: false },
        force:       { key: "pulse",         color: "dark_purple",projectile: "magic_missile",   impact: "themed",    blend: true },
        mental:      { key: "enchantment",   color: "pink",      projectile: "energy_strands",  impact: "themed",    blend: false },
        poison:      { key: "fumes",         color: "green",     projectile: "spell_projectile",impact: "acid",      blend: false },
        spirit:      { key: "divine",        color: "bluegold",  projectile: "guiding_bolt",    impact: "themed",    blend: false },
        void:        { key: "dark",          color: "black",     projectile: "ray_of_frost",    impact: "dark",      blend: false },
        vitality:    { key: "healing",       color: "bluegold",  projectile: "cure_wounds",     impact: "themed",    blend: false }
    },
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
    },
    defaults: {
        castRing: "jb2a.magic_signs.circle.02.common.intro.blue",
        groundRing: "jb2a.magic_signs.circle.ground.blue",
        impact: "jb2a.impact.themed.blue",
        projectile: "jb2a.spell_projectile.blue"
    }
};

const DAMAGE_PRIORITY = ["fire", "cold", "electricity", "acid", "sonic", "force", "spirit", "void", "vitality", "poison", "water"];

// ============================================================
// 3. UTILITY FUNCTIONS
// ============================================================
function getCuratedSpellSet() {
    if (CURATED_SPELL_SET) return CURATED_SPELL_SET;
    const macroPack = game.packs.get("pf2e-jb2a-macros.pf2e-jb2a-macros");
    if (!macroPack) return new Set();
    CURATED_SPELL_SET = new Set(macroPack.index.map(e => e.slug || e.name.toLowerCase()));
    return CURATED_SPELL_SET;
}

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
    } catch (e) { console.error("PF2e Heuristic | Asset check error:", e); }
    ASSET_CACHE.set(preferredPath, fallbackPath);
    return fallbackPath;
}

function maybeRandomize(path) {
    if (!game.settings.get("pf2e-heuristic-fallback", "randomVariants")) return path;
    const variant = String(Math.floor(Math.random() * 3) + 1).padStart(2, '0');
    if (/\.(png|webm)$/i.test(path)) {
        return path.replace(/\.(png|webm)$/i, `_v${variant}.$1`);
    }
    const variationPath = `${path}.${variant}`;
    if (Sequencer.Database?.hasEntry(variationPath)) return variationPath;
    return path;
}

function listenForTemplatePlacement(timeoutMs = 4000) {
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

// ============================================================
// 4. CORE PARSER & DESCRIPTION SCRAPER
// ============================================================
export function parseSpellToAnimation(spell) {
    const system = spell.system;
    const traits = [...(system.traits?.value || [])];
    const rank = system.rank || 1;
    const intensity = Math.min(2.5, 0.8 + rank * 0.2);
    
    const description = (system.description?.value || "").toLowerCase();
    
    // 4.1 Structural & School Keyword Scrapers
    const keywordTraitMaps = [
        { keywords: ["teleport", "dimension door", "blink", "shadow step", "warp"], trait: "teleportation" },
        { keywords: ["charm", "fascinate", "befuddle", "mind", "hypnotic", "sleep"], trait: "mental" },
        { keywords: ["heal", "soothe", "regeneration", "cure", "restoration"], trait: "healing" },
        { keywords: ["barrier", "shield", "ward", "protection", "absorb", "armor"], trait: "abjuration" }
    ];

    for (const map of keywordTraitMaps) {
        if (map.keywords.some(kw => description.includes(kw)) && !traits.includes(map.trait)) {
            traits.push(map.trait);
        }
    }

    // 4.2 Dynamic Damage Type/Element Scraping
    let detectedDamage = null;
    const damageEntries = Object.values(system.damage || {});
    if (damageEntries.length > 0) {
        const types = damageEntries.map(d => d.type).filter(Boolean);
        detectedDamage = DAMAGE_PRIORITY.find(p => types.includes(p)) || types[0];
    }
    
    if (!detectedDamage && !traits.some(t => JB2A_DICT.elements[t])) {
        const elementKeywords = {
            fire: ["fire", "burn", "flame", "scorch", "immolate", "blaze"],
            cold: ["cold", "ice", "frost", "freezing", "chill", "glacial"],
            electricity: ["lightning", "electricity", "shock", "spark", "bolt", "jolt"],
            acid: ["acid", "corrosive", "vitriol", "dissolve"],
            sonic: ["sonic", "thunder", "shriek", "blast", "acoustic"],
            spirit: ["radiant", "holy", "celestial", "sun", "beam", "light"],
            void: ["necrotic", "wither", "drain", "shadow", "darkness", "curse"]
        };

        for (const [element, keywords] of Object.entries(elementKeywords)) {
            if (keywords.some(kw => description.includes(kw))) {
                detectedDamage = element;
                break;
            }
        }
    }

    const themeKey = detectedDamage || traits.find(t => JB2A_DICT.elements[t]);
    const theme = JB2A_DICT.elements[themeKey] || JB2A_DICT.elements.force;
    const useBlend = game.settings.get("pf2e-heuristic-fallback", "blendModes") && theme.blend;

    // 4.3 Tradition Casting Circles
    const traditionKey = traits.find(t => JB2A_DICT.traditions[t]);
    let castRingPath = traditionKey 
        ? `${JB2A_DICT.traditions[traditionKey]}.${theme.color}`
        : `${JB2A_DICT.traditions.arcane}.${theme.color}`;
    castRingPath = safeGetFile(castRingPath, JB2A_DICT.defaults.castRing);
    let groundRingPath = safeGetFile(`jb2a.magic_signs.circle.ground.${theme.color}`, JB2A_DICT.defaults.groundRing);

    // School Overlays
    let schoolOverlay = null;
    const schoolTrait = traits.find(t => JB2A_DICT.schools[t]);
    if (schoolTrait) {
        const school = JB2A_DICT.schools[schoolTrait];
        schoolOverlay = safeGetFile(`${school.overlay}.${school.color}`, "jb2a.energy_strands.blue");
    }

    // 4.4 Condition Inference Scraping
    const inflictedConditions = [];
    const conditionKeywords = {
        frightened: ["fear", "frightened", "terrified", "intimidate", "scare"],
        paralyzed: ["paralyze", "paralyzed", "hold", "freeze"],
        slowed: ["slow", "slowed", "hinder", "sluggish"],
        stunned: ["stun", "stunned", "daze", "stagger"],
        sickened: ["sickened", "nausea", "poisoned", "toxic", "venom"]
    };

    for (const [condition, keywords] of Object.entries(conditionKeywords)) {
        if (keywords.some(kw => description.includes(kw))) {
            inflictedConditions.push(condition);
        }
    }
    if (system.condition && !inflictedConditions.includes(system.condition)) {
        inflictedConditions.push(system.condition);
    }

    // 4.5 Structural Spatial Tree Evaluation
    const areaType = system.area?.type;
    const rangeValue = system.range?.value || "touch";
    let pattern = "ON_TOKEN_TARGET";
    let primaryAsset = "";
    let impactAsset = JB2A_DICT.defaults.impact;

    const isPersistentArea = traits.includes("wall") || spell.name.toLowerCase().includes("wall") || traits.includes("web");
    const isEmanation = traits.includes("emanation") || system.area?.origin === "caster";
    const isRestraint = ["entangle", "grapple", "chain", "shackle", "web", "tether", "bind", "vine", "root"].some(kw => description.includes(kw));

    if (traits.includes("teleportation")) {
        pattern = "TELEPORTATION";
        primaryAsset = safeGetFile(`jb2a.teleport.01.intro.${theme.color}`, "jb2a.impact.themed.blue");
    } else if (isRestraint) {
        pattern = "RESTRAINT";
        const isNature = ["vine", "root", "entangle", "plant", "grass", "nature"].some(kw => description.includes(kw));
        primaryAsset = isNature ? JB2A_DICT.restraints.nature.overlay : JB2A_DICT.restraints.force.overlay;
        groundRingPath = isNature ? JB2A_DICT.restraints.nature.ground : JB2A_DICT.restraints.force.ground;
        
        primaryAsset = safeGetFile(primaryAsset, "jb2a.chains.standard.white");
        groundRingPath = safeGetFile(groundRingPath, JB2A_DICT.defaults.groundRing);
    } else if (areaType) {
        if (isPersistentArea) pattern = "PERSISTENT_AREA";
        else if (isEmanation && areaType === "burst") pattern = "EMANATION";
        else if (areaType === "cone") pattern = "CONE_AOE";
        else if (areaType === "line") pattern = "LINE_AOE";
        else pattern = "BURST_AOE";

        if (pattern === "CONE_AOE") {
            primaryAsset = traits.includes("fire") ? "jb2a.burning_hands.cone.01" : "jb2a.breath_weapons_v2.cone";
        } else if (pattern === "LINE_AOE") {
            primaryAsset = "jb2a.breath_weapons_v2.line";
        } else if (pattern === "PERSISTENT_AREA") {
            primaryAsset = traits.includes("fire") ? "jb2a.wall_of_fire" : "jb2a.breath_weapons_v2.line";
        } else {
            primaryAsset = "jb2a.template_circle_outpulse";
        }
        primaryAsset = safeGetFile(`${primaryAsset}.${theme.color}`, `jb2a.template_circle_outpulse.blue`);
    } else if (traits.includes("attack") || rangeValue === "ranged" || parseInt(rangeValue) > 5) {
        pattern = "PROJECTILE_RAY";
        primaryAsset = safeGetFile(`jb2a.${theme.projectile}.${theme.color}`, JB2A_DICT.defaults.projectile);
        impactAsset = safeGetFile(`jb2a.impact.${theme.impact}.${theme.color}`, 
            safeGetFile(`jb2a.impact.themed.${theme.color}`, JB2A_DICT.defaults.impact));
    } else {
        pattern = "ON_TOKEN_TARGET";
        const isHealing = traits.includes("healing") || traits.includes("vitality");
        if (isHealing) pattern = "HEALING_SEQUENCE";
        primaryAsset = isHealing ? "jb2a.healing_generic" : "jb2a.on_token_buff";
        primaryAsset = safeGetFile(`${primaryAsset}.${theme.color}`, `jb2a.on_token_buff.blue`);
    }

    return { pattern, castRingPath, groundRingPath, schoolOverlay, primaryAsset, impactAsset, 
             systemArea: system.area, intensity, inflictedConditions, isPersistentArea, useBlend, theme };
}

// ============================================================
// 5. ANIMATION EXECUTION ROUTINES
// ============================================================
export async function executeHeuristicAnimation(spell, token) {
    if (!token) return;
    if (activeSequences >= MAX_CONCURRENT) {
        console.debug("PF2e Heuristic | Engine threshold limit breached, dropped.");
        return;
    }

    const config = parseSpellToAnimation(spell);
    const targets = Array.from(game.user.targets);
    const gridSize = canvas.grid?.size || canvas.dimensions?.size || 100;

    let templatePromise = null;
    if (spell.system.area?.type || config.pattern === "TELEPORTATION") {
        templatePromise = listenForTemplatePlacement(4000);
    }

    const seq = new Sequence();
    activeSequences++;

    const applyBlend = (effect, blend = config.useBlend) => {
        if (blend) effect.blendMode("ADD");
        return effect;
    };

    try {
        // --- Stage 1: Ground/Casting Ring Layering ---
        seq.effect()
            .file(config.groundRingPath)
            .atLocation(token)
            .scaleToObject(1.6 * config.intensity)
            .opacity(0.5)
            .fadeIn(200)
            .wait(100);

        seq.effect()
            .file(config.castRingPath)
            .atLocation(token)
            .scaleToObject(1.4 * config.intensity)
            .waitUntilFinished(-400);

        // --- Stage 2: School Overlay ---
        if (config.schoolOverlay) {
            seq.effect()
                .file(config.schoolOverlay)
                .atLocation(token)
                .scaleToObject(1.2 * config.intensity)
                .fadeIn(300)
                .duration(800);
        }

        // --- Stage 3: Spatial Mechanics Router ---
        switch (config.pattern) {
            case "TELEPORTATION": {
                let destination = targets[0] || (templatePromise ? await templatePromise : null);
                const introFile = safeGetFile(`jb2a.teleport.01.intro.${config.theme.color}`, "jb2a.impact.themed.blue");
                const outroFile = safeGetFile(`jb2a.teleport.01.outro.${config.theme.color}`, "jb2a.impact.themed.blue");
                
                if (destination) {
                    applyBlend(seq.effect()
                        .file(introFile)
                        .atLocation(token)
                        .scaleToObject(1.3));
                    
                    seq.animation()
                        .on(token)
                        .fadeOut(250)
                        .teleportTo(destination)
                        .snapToGrid()
                        .waitUntilFinished();
                    
                    applyBlend(seq.effect()
                        .file(outroFile)
                        .atLocation(token)
                        .scaleToObject(1.3));
                        
                    seq.animation()
                        .on(token)
                        .fadeIn(250);
                } else {
                    applyBlend(seq.effect()
                        .file(introFile)
                        .atLocation(token)
                        .scaleToObject(1.2)
                        .waitUntilFinished(-300));
                    
                    seq.animation()
                        .on(token)
                        .fadeOut(150)
                        .delay(400)
                        .fadeIn(250);
                        
                    applyBlend(seq.effect()
                        .file(outroFile)
                        .atLocation(token)
                        .scaleToObject(1.2));
                }
                break;
            }

            case "RESTRAINT": {
                const actualTargets = targets.length > 0 ? targets : [token];
                for (let target of actualTargets) {
                    const targetUuid = target.document.uuid;

                    seq.effect()
                        .file(config.groundRingPath)
                        .atLocation(target)
                        .belowTokens()
                        .origin(targetUuid)
                        .name(`restraint-ground-${target.id}`)
                        .scaleToObject(1.5 * config.intensity)
                        .fadeIn(150)
                        .duration(3000)
                        .fadeOut(500);

                    const binding = seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(target)
                        .origin(targetUuid)
                        .name(`restraint-binding-${target.id}`)
                        .scaleToObject(1.2 * config.intensity)
                        .fadeIn(300)
                        .animateProperty("sprite", "position.y", { 
                            from: 10, 
                            to: 0, 
                            duration: 400, 
                            ease: "easeOutCubic" 
                        });

                    const isLongDuration = (spell.system.duration?.value || "").toLowerCase().includes("minute") || spell.system.traits?.value?.includes("sustained");
                    if (isLongDuration) {
                        binding.persist().duration(300000); // 5-minute safety threshold limit
                    } else {
                        binding.duration(3500).fadeOut(800);
                    }

                    if (!config.inflictedConditions.includes("restrained") && !config.inflictedConditions.includes("immobilized")) {
                        config.inflictedConditions.push("immobilized");
                    }
                    
                    for (let cond of config.inflictedConditions) {
                        seq.effect()
                            .file(safeGetFile(`jb2a.conditions.${cond}`, `jb2a.conditions.stunned`))
                            .atLocation(target)
                            .origin(targetUuid)
                            .scaleToObject(1.0)
                            .delay(400);
                    }
                }
                break;
            }

            case "PROJECTILE_RAY":
                for (let target of targets) {
                    applyBlend(seq.effect()
                        .file(maybeRandomize(config.primaryAsset))
                        .atLocation(token)
                        .stretchTo(target)
                        .scale(config.intensity));
                        
                    applyBlend(seq.effect()
                        .file(config.impactAsset)
                        .atLocation(target)
                        .scaleToObject(1.2 * config.intensity));
                    
                    if (game.settings.get("pf2e-heuristic-fallback", "lingeringEffects") && config.theme.key !== "force" && config.theme.key !== "mental") {
                        const lingeringPath = safeGetFile(`jb2a.lingering.${config.theme.key}.loop`, `jb2a.impact.themed.${config.theme.color}`);
                        seq.effect()
                            .file(lingeringPath)
                            .atLocation(target)
                            .scaleToObject(0.8)
                            .duration(1500)
                            .fadeOut(500);
                    }
                    
                    for (let cond of config.inflictedConditions) {
                        seq.effect()
                            .file(safeGetFile(`jb2a.conditions.${cond}`, `jb2a.conditions.stunned`))
                            .atLocation(target)
                            .scaleToObject(1.1);
                    }
                }
                break;

            case "HEALING_SEQUENCE":
                for (let target of (targets.length ? targets : [token])) {
                    seq.effect()
                        .file("jb2a.healing_generic.intro")
                        .atLocation(target)
                        .scaleToObject(1.3 * config.intensity);
                    seq.effect()
                        .file("jb2a.healing_generic.loop")
                        .atLocation(target)
                        .duration(600)
                        .scaleToObject(1.3 * config.intensity);
                    seq.effect()
                        .file("jb2a.healing_generic.outro")
                        .atLocation(target)
                        .scaleToObject(1.3 * config.intensity);
                }
                break;

            case "EMANATION": {
                const radiusPixels = (config.systemArea.value / 5) * gridSize;
                const scaleFactor = (radiusPixels * 2) / (token.document.width * gridSize);
                seq.effect()
                    .file(config.primaryAsset)
                    .atLocation(token)
                    .scale(scaleFactor * config.intensity)
                    .fadeIn(200);
                break;
            }

            case "CONE_AOE":
            case "BURST_AOE": {
                let areaTemplate = templatePromise ? await templatePromise : canvas.templates.active;
                if (!areaTemplate && targets.length > 0 && config.systemArea) {
                    const target = targets[0];
                    const ray = new Ray(token.center, target.center);
                    const distancePixels = (config.systemArea.value / 5) * gridSize;
                    applyBlend(seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(token.center)
                        .rotate(Math.toDegrees(ray.angle))
                        .size(distancePixels * config.intensity));
                } else if (areaTemplate) {
                    applyBlend(seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(areaTemplate.position)
                        .rotate(areaTemplate.document.direction)
                        .size({
                            width: areaTemplate.document.distance * (gridSize / 5) * config.intensity,
                            height: areaTemplate.document.distance * (gridSize / 5) * config.intensity
                        }));
                }
                break;
            }

            case "LINE_AOE": {
                let lineTemplate = templatePromise ? await templatePromise : canvas.templates.active;
                if (!lineTemplate && targets.length > 0 && config.systemArea) {
                    const target = targets[0];
                    const ray = new Ray(token.center, target.center);
                    const distancePixels = (config.systemArea.value / 5) * gridSize;
                    applyBlend(seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(token.center)
                        .stretchTo({ x: token.center.x + Math.cos(ray.angle) * distancePixels,
                                     y: token.center.y + Math.sin(ray.angle) * distancePixels })
                        .size({ height: gridSize }));
                } else if (lineTemplate) {
                    const ray = Ray.fromAngle(lineTemplate.position.x, lineTemplate.position.y,
                        Math.toRadians(lineTemplate.document.direction),
                        (lineTemplate.document.distance / 5) * gridSize);
                    applyBlend(seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(lineTemplate.position)
                        .stretchTo({ x: ray.B.x, y: ray.B.y })
                        .size({ height: gridSize }));
                }
                break;
            }

            case "PERSISTENT_AREA": {
                let areaTemplate = templatePromise ? await templatePromise : canvas.templates.active;
                if (areaTemplate) {
                    seq.effect()
                        .file(config.primaryAsset)
                        .atLocation(areaTemplate.position)
                        .rotate(areaTemplate.document.direction || 0)
                        .size({
                            width: (areaTemplate.document.distance || 10) * (gridSize / 5),
                            height: (areaTemplate.document.width || 5) * (gridSize / 5) || gridSize
                        })
                        .persist()
                        .duration(60000);
                }
                break;
            }

            case "ON_TOKEN_TARGET":
                const actualTargets = targets.length > 0 ? targets : [token];
                for (let target of actualTargets) {
                    applyBlend(seq.effect()
                        .file(maybeRandomize(config.primaryAsset))
                        .atLocation(target)
                        .scaleToObject(1.3 * config.intensity));
                    for (let cond of config.inflictedConditions) {
                        seq.effect()
                            .file(safeGetFile(`jb2a.conditions.${cond}`, `jb2a.conditions.stunned`))
                            .atLocation(target)
                            .scaleToObject(1.1);
                    }
                }
                break;
        }
    } finally {
        await seq.play();
        activeSequences--;
    }
}

// ============================================================
// 6. CHAT MESSAGE INTERCEPT LAYER
// ============================================================
Hooks.on("createChatMessage", async (message, options, userId) => {
    if (userId !== game.user.id) return;
    if (!game.settings.get("pf2e-heuristic-fallback", "enable")) return;

    const context = message.flags.pf2e?.context;
    if (context?.type !== "spell-cast") return;

    const spell = await fromUuid(context.item);
    if (!spell) return;

    const spellSlug = spell.slug || spell.system?.slug;
    const traits = spell.system?.traits?.value || [];

    if (traits.includes("summon") || traits.includes("incarnate")) return;
    const HARD_BLACKLIST = ["illusionary-object"];
    if (HARD_BLACKLIST.includes(spellSlug)) return;

    const curatedSet = getCuratedSpellSet();
    if (curatedSet.has(spellSlug) || curatedSet.has(spell.name.toLowerCase())) return;

    if (game.modules.get("automated-animations")?.active) {
        try {
            if (typeof AutomatedAnimations !== 'undefined') {
                const aaMatch = AutomatedAnimations.Registry?.getMatch?.(spell) ||
                                AutomatedAnimations.animations?.find?.(e => e.id === spellSlug);
                if (aaMatch) return;
            }
        } catch (err) { console.debug("PF2e Heuristic | Automated Animations bypass active."); }
    }

    const token = message.actor?.getActiveTokens()[0];
    if (token) {
        console.log(`PF2e Heuristic | v4.6 animating: ${spell.name}`);
        executeHeuristicAnimation(spell, token);
    }
});

// ============================================================
// 7. CONDITION LIFECYCLE SEED HOOK (AUTOMATED CLEANUP)
// ============================================================
Hooks.on("updateActor", async (actor, updateData, options, userId) => {
    if (game.user.id !== userId) return;
    if (!updateData.items) return;

    const trackedSlugs = ["immobilized", "restrained", "paralyzed"];

    const conditionCleared = updateData.items.some(item => {
        if (item._destruction || item.id === null) return true;
        
        const currentItem = actor.items.get(item._id);
        if (currentItem && currentItem.type === "condition") {
            const slug = currentItem.slug || currentItem.system?.slug;
            if (trackedSlugs.includes(slug)) {
                if (item.system && 'value' in item.system && item.system.value === 0) return true;
            }
        }
        return false;
    });

    if (conditionCleared) {
        const activeTokens = actor.getActiveTokens();
        for (let token of activeTokens) {
            const tokenUuid = token.document.uuid;
            const runningEffects = Sequencer.EffectManager.getEffects({ origin: tokenUuid });
            
            const targetedRestraints = runningEffects.filter(effect => 
                effect.name?.startsWith("restraint-ground-") || 
                effect.name?.startsWith("restraint-binding-")
            );

            if (targetedRestraints.length > 0) {
                console.log(`PF2e Heuristic | Condition cleared on [${actor.name}]. Dismissing persistent animations.`);
                Sequencer.EffectManager.endEffects({ origin: tokenUuid, name: `restraint-ground-${token.id}` });
                Sequencer.EffectManager.endEffects({ origin: tokenUuid, name: `restraint-binding-${token.id}` });
            }
        }
    }
});