// ============================================================
// CORE: Predicate-tree animation resolution (Phase K2). Walks the flattened
// PF2E_ANIMATION_TREES candidate list (data/animation-trees.js) for a slug,
// filters by trigger/role, evaluates each candidate's predicate via
// evaluatePredicate(), and returns the first whose predicate matches and
// whose file validates via isValidSequencerPath(). Depends on
// data/animation-trees.js, core/predicate-engine.js and
// core/asset-resolution.js.
//
// This is additive: it is not yet wired into parseSpellToAnimation() (that
// integration, plus new non-cast triggers like "attack-roll" for weapons/
// class abilities, is future work). For now it can be exercised directly,
// e.g. from the console, to validate predicate-driven resolution against the
// existing PF2E_GRAPHICS_ASSET_MAP results.
// ============================================================

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

    let result = null;
    for (const candidate of candidates) {
        if (candidate.trigger !== trigger || candidate.role !== role) continue;
        if (!evaluatePredicate(candidate.predicate, ctx)) continue;
        if (isValidSequencerPath(candidate.file)) {
            result = candidate.file;
            break;
        }
    }

    ASSET_CACHE.set(cacheKey, result);
    return result;
}
