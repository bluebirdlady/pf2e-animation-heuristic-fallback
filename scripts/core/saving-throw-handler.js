// ============================================================
// CORE: Saving-throw animation hook (Phase K5). Fires when a PF2e
// saving-throw chat message is created, resolves "saving-throw" trigger
// entries from PF2E_ANIMATION_TREES for the originating spell, and plays
// an impact / tokenBuff on the saving actor's token. Outcome facts
// (check:outcome:*) are injected into the predicate context so entries
// can discriminate between criticalSuccess / success / failure /
// criticalFailure.
//
// Depends on: settings.js, core/predicate-engine.js,
//             core/animation-tree-resolver.js, core/asset-resolution.js,
//             core/spell-parser.js (getSpellSlug).
//
// Gated behind "enableSaveAnimations" (default on). Only fires when the
// animation tree has a "saving-throw" trigger entry for the originating
// spell — no heuristic fallback, so there are zero false positives for
// saves against arbitrary spells/abilities without authored entries.
// ============================================================

const SAVE_OUTCOME_FACT = {
    criticalSuccess: "check:outcome:critical-success",
    success:         "check:outcome:success",
    failure:         "check:outcome:failure",
    criticalFailure: "check:outcome:critical-failure",
};

Hooks.off("createChatMessage", globalThis._pf2eHeuristicSaveHookId);

globalThis._pf2eHeuristicSaveHookId = Hooks.on("createChatMessage", (message, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enableSaveAnimations")) return;

    try {
        const context = message.flags?.pf2e?.context;
        if (!context || context.type !== "saving-throw") return;

        const outcomeFact = SAVE_OUTCOME_FACT[context.outcome];
        if (!outcomeFact) return;

        // The token that rolled the save — this is where the animation plays.
        const token = message.actor?.getActiveTokens()?.[0];
        if (!token) return;

        // Derive the originating spell slug. PF2e stores origin data in
        // multiple places depending on version; check each in order.
        const origin = message.flags?.pf2e?.origin;
        let originSlug = null;

        if (origin?.slug) {
            originSlug = origin.slug;
        } else if (origin?.name) {
            originSlug = getSpellSlug({ name: origin.name });
        } else {
            // Fall back to scanning roll options for "origin:item:slug:X"
            // (present in most PF2e versions alongside other option strings).
            const opts = context.options ? [...context.options] : [];
            for (const opt of opts) {
                const m = String(opt).match(/^origin:item:slug:(.+)$/);
                if (m) { originSlug = m[1]; break; }
            }
        }

        if (!originSlug) return;

        // Build predicate context: inject the outcome fact plus the full
        // roll-option set so predicate entries can gate on traits/etc.
        const rollOpts = context.options
            ? (Array.isArray(context.options) ? context.options : [...context.options])
            : [];
        const saveCtx = buildPredicateContext(null, {
            facts: [outcomeFact, ...rollOpts],
        });

        const impact    = resolveAnimationTreeAsset(originSlug, "saving-throw", "impact",    saveCtx);
        const tokenBuff = resolveAnimationTreeAsset(originSlug, "saving-throw", "tokenBuff", saveCtx);

        if (!impact && !tokenBuff) return;

        const SequenceClass = typeof Sequence !== "undefined"
            ? Sequence
            : game.modules.get("sequencer")?.api?.Sequence;
        if (!SequenceClass) return;

        console.log(
            `%cPF2E HEURISTIC %c| Save animation "${originSlug}" (${context.outcome})` +
            `${impact     ? ` impact:${impact}`    : ""}` +
            `${tokenBuff  ? ` buff:${tokenBuff}`   : ""}`,
            "color: #00ffcc; font-weight: bold;", "color: #ffffff;"
        );

        const seq = new SequenceClass();

        if (impact) {
            seq.effect()
                .file(impact)
                .atLocation(token)
                .size(token.document.width * 1.5, { gridUnits: true })
                .fadeIn(200)
                .fadeOut(400);
        }

        if (tokenBuff) {
            seq.effect()
                .file(tokenBuff)
                .atLocation(token)
                .size(token.document.width * 1.2, { gridUnits: true })
                .duration(4000)
                .fadeIn(500)
                .fadeOut(500)
                .attachTo(token);
        }

        seq.play();

    } catch (e) {
        console.debug("PF2e Heuristic | Save animation hook error (non-fatal):", e.message);
    }
});
