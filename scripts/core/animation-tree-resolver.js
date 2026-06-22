// ============================================================
// CORE: Predicate-tree animation resolution (Phase K2). Walks the flattened
// PF2E_ANIMATION_TREES candidate list (data/animation-trees.js) for a slug,
// filters by trigger/role, evaluates each candidate's predicate via
// evaluatePredicate(), and returns the first whose predicate matches and
// whose file validates via isValidSequencerPath(). Depends on
// data/animation-trees.js, core/predicate-engine.js and
// core/asset-resolution.js.
//
// As of Phase K3, this is the primary resolver used by
// parseSpellToAnimation()'s PF2e Graphics override block (with
// PF2E_GRAPHICS_ASSET_MAP as a fallback for slugs/roles the predicate tree
// doesn't resolve).
//
// Phase K4 adds resolveStrikeAnimationAsset(), the equivalent for weapon
// strikes (attack-roll trigger), backed by data/strike-animation-trees.js
// (PF2E_STRIKE_TREES, keyed by weapon slug/base/group rather than item slug).
// ============================================================

// Shared candidate search: returns the first candidate's file whose
// trigger/role match and whose accumulated predicate matches ctx, validated
// via isValidSequencerPath(). Returns null if none match/validate.
function findFirstValidCandidate(candidates, trigger, role, ctx) {
    for (const candidate of candidates) {
        if (candidate.trigger !== trigger || candidate.role !== role) continue;
        if (!evaluatePredicate(candidate.predicate, ctx)) continue;
        if (isValidSequencerPath(candidate.file)) {
            return candidate.file;
        }
    }
    return null;
}

// Returns the first valid JB2A path for (slug, trigger, role) whose
// accumulated predicate matches the given context, or null if no candidate
// matches/validates. Memoized in ASSET_CACHE, keyed on slug/trigger/role and
// a stable serialization of the context's facts/values (since the result
// depends on context, unlike the Phase J PF2E_GRAPHICS_ASSET_MAP lookup).
function resolveAnimationTreeAsset(slug, trigger, role, context) {
    if (!slug || !trigger || !role) return null;

    const candidates = PF2E_ANIMATION_TREES[slug] || [];
    if (candidates.length === 0) return null;

    const ctx = {
        facts: context?.facts || new Set(),
        values: context?.values || {}
    };

    const cacheKey = `animTree-${slug}-${trigger}-${role}-${[...ctx.facts].sort().join(",")}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    const result = findFirstValidCandidate(candidates, trigger, role, ctx);

    ASSET_CACHE.set(cacheKey, result);
    return result;
}

// NEW (Phase K8): Returns ALL valid files for (slug, trigger, role) whose
// predicates match ctx, deduplicated by file path. Each result carries
// {file, persistent} where persistent=true if "settings:persistent" appears
// anywhere in that candidate's predicate — callers use this to play the
// animation with .persist() vs. as a one-shot. Needed for place-template
// entries that intentionally match multiple entries (e.g. alarm: intro once +
// complete loop when settings:persistent is enabled).
function resolveAllAnimationTreeEntries(slug, trigger, role, context) {
    if (!slug || !trigger || !role) return [];
    const candidates = PF2E_ANIMATION_TREES[slug] || [];
    const ctx = {
        facts: context?.facts || new Set(),
        values: context?.values || {}
    };
    const seen = new Set();
    const results = [];
    for (const candidate of candidates) {
        if (candidate.trigger !== trigger || candidate.role !== role) continue;
        if (!evaluatePredicate(candidate.predicate, ctx)) continue;
        if (!isValidSequencerPath(candidate.file)) continue;
        if (seen.has(candidate.file)) continue;
        seen.add(candidate.file);
        const predArr = Array.isArray(candidate.predicate)
            ? candidate.predicate : [candidate.predicate];
        const persistent = predArr.some(p => p === "settings:persistent");
        results.push({ file: candidate.file, persistent });
    }
    return results;
}

// NEW (Phase K4): Resolves a weapon-strike animation asset for (trigger,
// role), trying PF2E_STRIKE_TREES.bySlug[weapon.slug], then
// .byBase[weapon.baseType], then .byGroup[weapon.group] - most specific
// first - returning the first match that validates. weapon is
// { slug, baseType, group }; any of these may be null/undefined.
function resolveStrikeAnimationAsset(weapon, trigger, role, context) {
    if (!weapon || !trigger || !role) return null;

    const ctx = {
        facts: context?.facts || new Set(),
        values: context?.values || {}
    };

    const lookups = [
        ["bySlug", weapon.slug],
        ["byBase", weapon.baseType],
        ["byGroup", weapon.group]
    ];

    const cacheKey = `strikeTree-${weapon.slug}-${weapon.baseType}-${weapon.group}-${trigger}-${role}-${[...ctx.facts].sort().join(",")}`;
    if (ASSET_CACHE.has(cacheKey)) return ASSET_CACHE.get(cacheKey);

    let result = null;
    for (const [bucket, key] of lookups) {
        if (!key) continue;
        const candidates = PF2E_STRIKE_TREES[bucket]?.[key];
        if (!candidates || candidates.length === 0) continue;
        result = findFirstValidCandidate(candidates, trigger, role, ctx);
        if (result) break;
    }

    ASSET_CACHE.set(cacheKey, result);
    return result;
}
