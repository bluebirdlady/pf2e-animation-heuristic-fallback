// ============================================================
// CORE: Spell classification and config parsing. Depends on
// data/asset-maps.js, core/asset-resolution.js, core/predicate-engine.js,
// data/animation-trees.js, and core/animation-tree-resolver.js.
// ============================================================

// NEW (Phase E): Caches parseSpellToAnimation() results per spell so the same
// spell isn't re-parsed/re-classified on every cast. Cleared once it grows
// past CONFIG_CACHE_LIMIT entries to avoid unbounded growth.
const CONFIG_CACHE = new Map();
const CONFIG_CACHE_LIMIT = 500;

// NEW (Phase J): Shared slug derivation, used by both the curated-spell check
// and the PF2e Graphics asset map lookup.
function getSpellSlug(spell) {
    return spell.slug || (typeof spell.name?.slugify === "function"
        ? spell.name.slugify({ strict: true })
        : (spell.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
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
            const spellSlug = getSpellSlug(spell);

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

    const areaShape = spell.system?.area?.type;

    // NEW (Phase I): Prefer the spell's structured area.type (burst,
    // emanation, cube, square, circle) over description-string matching for
    // burst classification - some spells (e.g. emanation auras) never use
    // the words "burst"/"emanation"/etc. in their description text.
    const burstAreaShapes = ["burst", "emanation", "cube", "square", "circle"];
    if (burstAreaShapes.includes(areaShape)) {
        config.type = "burst";
    } else if (searchString.includes("burst") || searchString.includes("emanation") || searchString.includes("radius") || searchString.includes("splash")) {
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
    if (areaShape === "cone" || areaShape === "line") {
        const areaEffect = resolveElementalAreaAsset(config.elementTrait, areaShape);
        if (areaEffect) {
            config.type = areaShape;
            config.areaEffect = areaEffect;
        }
    }

    // NEW (Phase I): Ring assets use a separate color alias so elements whose
    // KEYWORD_MAP color falls outside the circle.02 12-color family (e.g.
    // "orange", "pinkpurple") still get a non-blue ring instead of falling
    // back to the generic blue circle.01 entry.
    const ringColor = RING_COLOR_ALIASES[config.color] || config.color;
    config.castRing   = resolveAssetWithFallback("castRing", ringColor);
    config.groundRing = resolveAssetWithFallback("groundRing", ringColor);
    config.impact     = resolveAssetWithFallback("impact", config.color);
    config.projectile = resolveAssetWithFallback("projectile", config.color);
    config.tokenBuff  = resolveAssetWithFallback("tokenBuff", config.color);

    // NEW (Phase C): When enabled, gather variant pools for visual variety.
    // Only attached when 2+ valid options exist; rendering falls back to the
    // single resolved path above otherwise.
    if (getSettingSafe("randomVariants")) {
        for (const assetType of ["castRing", "groundRing", "impact", "projectile", "tokenBuff"]) {
            const variantColor = (assetType === "castRing" || assetType === "groundRing") ? ringColor : config.color;
            const variants = resolveAssetVariants(assetType, variantColor);
            if (variants.length > 1) {
                config[`${assetType}Variants`] = variants;
            }
        }
    }

    // NEW (Phase J, extended Phase K3): Apply hand-curated PF2e Graphics
    // asset overrides, if available and enabled. Only overrides slots with a
    // valid resolved asset; everything else keeps its heuristic-derived
    // value.
    if (getSettingSafe("usePf2eGraphicsAssets")) {
        const pgSlug = getSpellSlug(spell);
        if (pgSlug && (PF2E_ANIMATION_TREES[pgSlug] || PF2E_GRAPHICS_ASSET_MAP[pgSlug])) {
            // NEW (Phase K3): Predicate-tree resolution first (item traits,
            // melee/ranged, asset availability, settings), falling back to
            // the flat Phase J map for slugs/roles the tree doesn't cover.
            const treeContext = buildPredicateContext(spell, {
                rangeKind: config.type === "melee" ? "melee" : "ranged"
            });
            const resolveRole = (role) =>
                resolveAnimationTreeAsset(pgSlug, "attack-roll", role, treeContext)
                || resolvePf2eGraphicsAsset(pgSlug, role);

            const pgProjectile = resolveRole("projectile");
            if (pgProjectile) {
                config.projectile = pgProjectile;
                delete config.projectileVariants;
            }

            const pgImpact = resolveRole("impact");
            if (pgImpact) {
                config.impact = pgImpact;
                delete config.impactVariants;
            }

            const pgArea = resolveRole("areaEffect");
            if (pgArea) {
                if (config.type === "cone" || config.type === "line") {
                    config.areaEffect = pgArea;
                } else if (config.type === "burst") {
                    config.groundRing = pgArea;
                    delete config.groundRingVariants;
                }
            }

            if (pgProjectile || pgImpact || pgArea) {
                config.pf2eGraphicsSlug = pgSlug;
                console.debug(`PF2e Heuristic | Applied PF2e Graphics asset overrides for "${pgSlug}"`);
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
