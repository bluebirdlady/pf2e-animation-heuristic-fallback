// ============================================================
// CORE: Asset path resolution and validation against the Sequencer
// Database. Depends on data/asset-maps.js (EXPLICIT_DATABASE_MAP,
// ASSET_FALLBACK_CHAIN, ELEMENTAL_AREA_ASSETS, PF2E_GRAPHICS_ASSET_MAP).
// ============================================================
const ASSET_CACHE = new Map();

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
            if (Array.isArray(entry) ? entry.length > 0 : entry.file !== undefined || entry.children !== undefined) {
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

// Returns the first valid JB2A path for a spell slug/role from
// PF2E_GRAPHICS_ASSET_MAP, or null if the slug/role has no entry or none of
// its candidates validate. Memoized in ASSET_CACHE.
function resolvePf2eGraphicsAsset(slug, role) {
    if (!slug || !role) return null;
    const cacheKey = `pf2eGraphics-${slug}-${role}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const candidates = PF2E_GRAPHICS_ASSET_MAP[slug]?.[role] || [];
    let result = null;
    for (const candidate of candidates) {
        if (isValidSequencerPath(candidate)) {
            result = candidate;
            break;
        }
    }

    ASSET_CACHE.set(cacheKey, result);
    return result;
}

// NEW (Phase J): Gap-tracking helper. Scans every spell Item across all
// installed compendiums, checks whether its slug has a PF2E_GRAPHICS_ASSET_MAP
// entry, and logs coverage stats plus a sample of uncovered spell names. Run
// from the console: reportPf2eGraphicsCoverage()
async function reportPf2eGraphicsCoverage() {
    const covered = [];
    const uncovered = [];
    const seenSlugs = new Set();

    for (const pack of game.packs) {
        if (pack.documentName !== "Item") continue;

        let index;
        try {
            index = await pack.getIndex({ fields: ["type"] });
        } catch (e) {
            continue;
        }

        for (const entry of index) {
            if (entry.type !== "spell") continue;

            const slug = getSpellSlug({ name: entry.name, slug: entry.slug });
            if (!slug || seenSlugs.has(slug)) continue;
            seenSlugs.add(slug);

            if (PF2E_GRAPHICS_ASSET_MAP[slug]) {
                covered.push({ name: entry.name, slug });
            } else {
                uncovered.push({ name: entry.name, slug });
            }
        }
    }

    const total = covered.length + uncovered.length;
    const pct = total > 0 ? ((covered.length / total) * 100).toFixed(1) : "0.0";

    console.log(`%cPF2e Heuristic | PF2e Graphics asset coverage: ${covered.length}/${total} spells (${pct}%)`, "color:#ffaa00;font-weight:bold;");
    console.log("PF2e Heuristic | Covered spells:", covered.map(c => c.name).sort());
    console.log("PF2e Heuristic | Uncovered spells (sample of 25):", uncovered.slice(0, 25).map(c => c.name).sort());

    return { covered, uncovered, total, coveragePercent: pct };
}
