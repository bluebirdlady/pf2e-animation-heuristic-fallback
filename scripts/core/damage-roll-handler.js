// ============================================================
// CORE: Damage-roll animation hook (Phase K6). Fires when a PF2e
// damage-roll chat message is created, resolves "damage-roll" trigger
// entries from PF2E_ANIMATION_TREES for the originating spell/ability,
// and plays projectile + impact animations toward each targeted token.
//
// This is the third trigger in the K-series (after K3 attack-roll and K5
// saving-throw). It fires when the caster explicitly rolls damage — a
// distinct visual moment from the initial cast (K3) and the save result
// (K5). Typical use: electric-arc chain lightning, daze mental bolt,
// force barrage missile, etc.
//
// Depends on: settings.js, core/predicate-engine.js,
//             core/animation-tree-resolver.js, core/asset-resolution.js,
//             core/spell-parser.js (getSpellSlug).
//
// Gated behind "enableDamageRollAnimations" (default on). Only fires when
// the tree has a "damage-roll" trigger entry for the spell — no heuristic
// fallback, so no false positives.
// ============================================================

Hooks.off("createChatMessage", globalThis._pf2eHeuristicDamageHookId);

globalThis._pf2eHeuristicDamageHookId = Hooks.on("createChatMessage", (message, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enableDamageRollAnimations")) return;

    try {
        const context = message.flags?.pf2e?.context;
        if (!context || context.type !== "damage-roll") return;

        // Caster token — the actor who owns the damage roll.
        const casterToken = message.actor?.getActiveTokens()?.[0]
            || canvas.tokens?.controlled?.[0];
        if (!casterToken) return;

        // Derive originating spell slug from origin flags, then roll options.
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

        // Build predicate context from roll options (no outcome fact needed
        // here — damage-roll predicates in the tree gate on traits/patreon,
        // not on check outcomes).
        const rollOpts = context.options
            ? (Array.isArray(context.options) ? context.options : [...context.options])
            : [];
        const damageCtx = buildPredicateContext(null, { facts: rollOpts });

        const projectile = resolveAnimationTreeAsset(originSlug, "damage-roll", "projectile", damageCtx);
        const impact     = resolveAnimationTreeAsset(originSlug, "damage-roll", "impact",     damageCtx);

        if (!projectile && !impact) return;

        // Targets: use current user targets (typically still set from the
        // original cast). Skip entirely if none are targeted.
        const targets = Array.from(game.user.targets)
            .filter(t => canvas.tokens?.placeables.includes(t));
        if (targets.length === 0) return;

        const SequenceClass = typeof Sequence !== "undefined"
            ? Sequence
            : game.modules.get("sequencer")?.api?.Sequence;
        if (!SequenceClass) return;

        console.log(
            `%cPF2E HEURISTIC %c| Damage-roll animation "${originSlug}"` +
            `${projectile ? ` proj:${projectile}` : ""}` +
            `${impact     ? ` impact:${impact}`   : ""}` +
            ` → ${targets.map(t => t.name).join(", ")}`,
            "color: #00ffcc; font-weight: bold;", "color: #ffffff;"
        );

        const seq = new SequenceClass();

        for (const target of targets) {
            if (projectile) {
                seq.effect()
                    .file(projectile)
                    .atLocation(casterToken)
                    .stretchTo(target)
                    .missed(false);
            }
            if (impact) {
                seq.effect()
                    .file(impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .fadeIn(200)
                    .fadeOut(400)
                    .delay(projectile ? 300 : 0);
            }
        }

        seq.play();

    } catch (e) {
        console.debug("PF2e Heuristic | Damage-roll animation hook error (non-fatal):", e.message);
    }
});
