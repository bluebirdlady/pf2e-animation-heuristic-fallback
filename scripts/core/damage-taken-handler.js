// ============================================================
// CORE: Damage-taken animation hook (Phase K7). Fires when a token's HP
// changes after a damage or healing roll that has "damage-taken" trigger
// entries in PF2E_ANIMATION_TREES. Typical use: Heal green orb landing on
// the healed token, Lay on Hands glow, Breath of Life revival, etc.
//
// Two hooks work together:
//   1. createChatMessage (damage-roll) — enqueues slugs that have
//      "damage-taken" tree entries, capturing caster token + targets.
//   2. preUpdateActor / updateActor — when HP changes, consumes the most
//      recent queued entry to play the animation on the updated token.
//
// Why two hooks instead of one: in PF2e, rolling healing dice fires a
// "damage-roll" chat message (same as damage), but the actual HP change
// happens later when someone clicks "Apply Healing". Separating detection
// from playback lets the animation appear at the moment HP is restored.
//
// Depends on: settings.js, core/predicate-engine.js,
//             core/animation-tree-resolver.js, core/asset-resolution.js,
//             core/spell-parser.js (getSpellSlug).
//
// Gated behind "enableDamageTakenAnimations" (default on). Only fires when
// the tree has a "damage-taken" trigger entry — no heuristic fallback.
// ============================================================

// Rehydrate hook registrations on hot-reload.
Hooks.off("createChatMessage", globalThis._pf2eHeuristicDamageTakenChatHookId);
Hooks.off("preUpdateActor",    globalThis._pf2eHeuristicDamageTakenPreHookId);
Hooks.off("updateActor",       globalThis._pf2eHeuristicDamageTakenHookId);

// ---------------------------------------------------------------------------
// Queue: recent damage-roll events that have "damage-taken" tree entries.
// Consumed by the updateActor hook when HP changes.
// ---------------------------------------------------------------------------
const _DAMAGE_TAKEN_QUEUE_TTL = 10000; // ms
if (!globalThis._pf2eHeuristicDamageTakenQueue) {
    globalThis._pf2eHeuristicDamageTakenQueue = [];
}
const _dtQueue = globalThis._pf2eHeuristicDamageTakenQueue;

const _dtPrune = () => {
    const cutoff = Date.now() - _DAMAGE_TAKEN_QUEUE_TTL;
    while (_dtQueue.length && _dtQueue[0].timestamp < cutoff) _dtQueue.shift();
};

// ---------------------------------------------------------------------------
// Hook 1: createChatMessage — detect damage-roll messages and enqueue if
// the originating slug has "damage-taken" tree entries.
// ---------------------------------------------------------------------------
globalThis._pf2eHeuristicDamageTakenChatHookId = Hooks.on("createChatMessage", (message, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enableDamageTakenAnimations")) return;

    try {
        const context = message.flags?.pf2e?.context;
        if (!context || context.type !== "damage-roll") return;

        // Derive slug using the same three-level fallback as K6.
        const origin = message.flags?.pf2e?.origin;
        let originSlug = null;
        if (origin?.slug) {
            originSlug = origin.slug;
        } else if (origin?.name) {
            originSlug = getSpellSlug({ name: origin.name });
        } else {
            const opts = context.options ? [...context.options] : [];
            for (const opt of opts) {
                const m = String(opt).match(/^origin:item:slug:(.+)$/);
                if (m) { originSlug = m[1]; break; }
            }
        }
        if (!originSlug) return;

        // Only enqueue if this slug actually has "damage-taken" entries.
        const testCtx    = buildPredicateContext(null, {});
        const hasImpact  = resolveAnimationTreeAsset(originSlug, "damage-taken", "impact",     testCtx);
        const hasProj    = resolveAnimationTreeAsset(originSlug, "damage-taken", "projectile", testCtx);
        if (!hasImpact && !hasProj) return;

        const casterToken = message.actor?.getActiveTokens()?.[0]
            || canvas.tokens?.controlled?.[0];
        const targets = Array.from(game.user.targets)
            .filter(t => canvas.tokens?.placeables.includes(t));

        _dtPrune();
        _dtQueue.push({ slug: originSlug, casterToken, targets, timestamp: Date.now() });

    } catch (e) {
        console.debug("PF2e Heuristic | Damage-taken enqueue error (non-fatal):", e.message);
    }
});

// ---------------------------------------------------------------------------
// Hook 2a: preUpdateActor — snapshot old HP before Foundry writes new value.
// ---------------------------------------------------------------------------
globalThis._pf2eHeuristicDamageTakenPreHookId = Hooks.on("preUpdateActor", (actor, changes) => {
    if (changes.system?.attributes?.hp?.value !== undefined) {
        actor._pf2eHeuristicOldHp = actor.system.attributes.hp.value;
    }
});

// ---------------------------------------------------------------------------
// Hook 2b: updateActor — HP changed; consume the most recent queued entry
// and play the "damage-taken" animation on the affected token.
// ---------------------------------------------------------------------------
globalThis._pf2eHeuristicDamageTakenHookId = Hooks.on("updateActor", (actor, changes, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enableDamageTakenAnimations")) return;

    try {
        const newHp = changes.system?.attributes?.hp?.value;
        const oldHp = actor._pf2eHeuristicOldHp;
        if (newHp === undefined || oldHp === undefined || newHp === oldHp) {
            delete actor._pf2eHeuristicOldHp;
            return;
        }
        delete actor._pf2eHeuristicOldHp;

        _dtPrune();
        if (_dtQueue.length === 0) return;

        // Find the most recent queued entry whose target list includes this
        // actor (or is empty, meaning no specific targets were selected).
        const actorTokens = actor.getActiveTokens();
        let entry = null;
        for (let i = _dtQueue.length - 1; i >= 0; i--) {
            const e = _dtQueue[i];
            if (e.targets.length === 0 || e.targets.some(t => actorTokens.includes(t))) {
                entry = e;
                break;
            }
        }
        // If no targeted match, fall back to the most recent entry.
        if (!entry) entry = _dtQueue[_dtQueue.length - 1];

        // Build predicate context (no outcome fact — damage-taken predicates
        // gate on patreon/quality/traits, not check outcomes).
        const damageCtx = buildPredicateContext(null, {});
        const projectile = resolveAnimationTreeAsset(entry.slug, "damage-taken", "projectile", damageCtx);
        const impact     = resolveAnimationTreeAsset(entry.slug, "damage-taken", "impact",     damageCtx);

        if (!projectile && !impact) return;

        // Token to animate on — prefer the actor's own active token.
        const token = actorTokens[0]
            || canvas.tokens?.placeables.find(t => t.actor?.id === actor.id);
        if (!token) return;

        const SequenceClass = typeof Sequence !== "undefined"
            ? Sequence
            : game.modules.get("sequencer")?.api?.Sequence;
        if (!SequenceClass) return;

        const deltaSign = newHp > oldHp ? "healing" : "damage";
        console.log(
            `%cPF2E HEURISTIC %c| Damage-taken animation "${entry.slug}" (${deltaSign} ${Math.abs(newHp - oldHp)}) on ${actor.name}` +
            `${projectile ? ` proj:${projectile}` : ""}` +
            `${impact     ? ` impact:${impact}`   : ""}`,
            "color: #00ffcc; font-weight: bold;", "color: #ffffff;"
        );

        const seq = new SequenceClass();

        if (projectile && entry.casterToken && entry.casterToken !== token) {
            seq.effect()
                .file(projectile)
                .atLocation(entry.casterToken)
                .stretchTo(token)
                .missed(false);
        }

        if (impact) {
            seq.effect()
                .file(impact)
                .atLocation(token)
                .size(token.document.width * 1.5, { gridUnits: true })
                .fadeIn(200)
                .fadeOut(400)
                .delay(projectile ? 300 : 0);
        }

        seq.play();

    } catch (e) {
        console.debug("PF2e Heuristic | Damage-taken animation hook error (non-fatal):", e.message);
    }
});
