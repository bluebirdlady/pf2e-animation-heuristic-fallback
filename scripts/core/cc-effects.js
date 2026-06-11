// ============================================================
// CORE: Persistent crowd-control overlay effects. Depends on
// settings.js, data/asset-maps.js (ENHANCED_CLASSIFICATION) and
// core/asset-resolution.js (ASSET_CACHE, isValidSequencerPath).
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
