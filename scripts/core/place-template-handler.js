// ============================================================
// CORE: Place-template animation hook (Phase K8). Fires when a PF2e spell
// places a measured template on the canvas, resolves "place-template" trigger
// entries from PF2E_ANIMATION_TREES for the originating spell, and plays:
//   areaEffect — at the template origin, sized/rotated to match the template
//   impact     — on the caster token (e.g. divine-wrath caster flash)
//   projectile — from caster toward the template origin (rare)
//
// Unlike K3/K5/K6 (which hook createChatMessage), K8 hooks the Foundry
// createMeasuredTemplate event fired immediately after template placement.
// This gives area spells their landing animation at the precise moment and
// location the player chose, rather than guessing from chat context.
//
// Multiple areaEffect entries may fire simultaneously. Entries with
// "settings:persistent" in their predicate play as looping effects attached
// to the template document (and auto-removed when the template is deleted).
// This enables the intro + loop pattern (e.g. alarm: brief intro flash, then
// a persistent magic circle until the template is removed).
//
// Template-type facts ("origin:item:area:type:cone", "…:burst", "…:line") are
// injected automatically from templateDoc.t so predicates like howling-
// blizzard's cone vs. burst branching work without extra data.
//
// Origin item traits ("origin:item:trait:holy", "…:unholy", etc.) are loaded
// via fromUuidSync from the template's origin UUID, enabling trait-gated
// entries like divine-wrath's holy vs. unholy branching.
//
// Depends on: settings.js, core/predicate-engine.js,
//             core/animation-tree-resolver.js (resolveAllAnimationTreeEntries),
//             core/asset-resolution.js, core/spell-parser.js (getSpellSlug).
//
// Gated behind "enablePlaceTemplateAnimations" (default on).
// ============================================================

Hooks.off("createMeasuredTemplate", globalThis._pf2eHeuristicTemplateHookId);

globalThis._pf2eHeuristicTemplateHookId = Hooks.on("createMeasuredTemplate", (templateDoc, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enablePlaceTemplateAnimations")) return;

    try {
        // ── 1. Derive origin slug ──────────────────────────────────────────
        const pf2eFlags = templateDoc.flags?.pf2e;
        const origin    = pf2eFlags?.origin;

        let originSlug = null;
        if (origin?.slug) {
            originSlug = origin.slug;
        } else if (origin?.name) {
            originSlug = getSpellSlug({ name: origin.name });
        }
        if (!originSlug) return;

        // ── 2. Build predicate context ─────────────────────────────────────
        // Inject: template-type fact (so cone/burst branching works),
        //         origin item traits (loaded from UUID for holy/unholy, etc.)
        const tType = templateDoc.t; // "circle", "cone", "ray", "rect"
        const typeFact =
            tType === "circle" ? "origin:item:area:type:burst" :
            tType === "cone"   ? "origin:item:area:type:cone"  :
            tType === "ray"    ? "origin:item:area:type:line"   : null;

        const itemUuid  = origin?.uuid ?? pf2eFlags?.itemUuid;
        const originItem = (typeof fromUuidSync === "function" && itemUuid)
            ? fromUuidSync(itemUuid) : null;

        const templateCtx = buildPredicateContext(null, {
            origin: originItem,
            facts:  typeFact ? [typeFact] : [],
        });

        // ── 3. Resolve assets ──────────────────────────────────────────────
        // areaEffect: may be multi-entry (intro + persistent loop)
        const areaEntries = resolveAllAnimationTreeEntries(
            originSlug, "place-template", "areaEffect", templateCtx);
        const impact      = resolveAnimationTreeAsset(
            originSlug, "place-template", "impact",     templateCtx);
        const projectile  = resolveAnimationTreeAsset(
            originSlug, "place-template", "projectile", templateCtx);

        if (areaEntries.length === 0 && !impact && !projectile) return;

        // ── 4. Caster token ────────────────────────────────────────────────
        const actorUuid = pf2eFlags?.actorUuid ?? origin?.actorUuid;
        let casterToken = null;
        if (typeof fromUuidSync === "function" && actorUuid) {
            casterToken = fromUuidSync(actorUuid)?.getActiveTokens()?.[0] ?? null;
        }
        casterToken = casterToken || canvas.tokens?.controlled?.[0] || null;

        // ── 5. Geometry ────────────────────────────────────────────────────
        const tX       = templateDoc.x;
        const tY       = templateDoc.y;
        const tDir     = templateDoc.direction ?? 0;
        const tDist    = templateDoc.distance ?? 5;
        const gridDist = canvas.grid?.distance ?? 5;

        // Size in grid squares.  Cones: length.  Bursts/circles: diameter.
        const sizeGU = tType === "cone" || tType === "ray"
            ? tDist / gridDist
            : (tDist * 2) / gridDist;

        // For cone/ray, the native JB2A asset orientation is RIGHT (east = 0°
        // in Foundry's template direction system), so .rotate(tDir) aligns it.
        const needsRotation = tType === "cone" || tType === "ray";

        // ── 6. Build Sequencer sequence ────────────────────────────────────
        const SequenceClass = typeof Sequence !== "undefined"
            ? Sequence
            : game.modules.get("sequencer")?.api?.Sequence;
        if (!SequenceClass) return;

        console.log(
            `%cPF2E HEURISTIC %c| Template animation "${originSlug}" (${tType}, ${tDist}ft)` +
            (areaEntries.length ? ` area:[${areaEntries.map(e => e.file).join(", ")}]` : "") +
            (impact     ? ` impact:${impact}`     : "") +
            (projectile ? ` proj:${projectile}`   : ""),
            "color: #00ffcc; font-weight: bold;", "color: #ffffff;"
        );

        const seq = new SequenceClass();

        // areaEffect entries — play all matches (supports intro + loop pattern)
        for (const { file, persistent } of areaEntries) {
            const eff = seq.effect()
                .file(file)
                .atLocation({ x: tX, y: tY })
                .size(sizeGU, { gridUnits: true })
                .fadeIn(200)
                .fadeOut(400);

            if (needsRotation) eff.rotate(tDir);

            if (persistent) {
                const tObj = templateDoc.object ?? null;
                eff.persist();
                if (tObj) eff.attachTo(tObj);
            }
        }

        // impact — plays on the caster (e.g. divine-wrath caster flash)
        if (impact && casterToken) {
            seq.effect()
                .file(impact)
                .atLocation(casterToken)
                .size(casterToken.document.width * 1.5, { gridUnits: true })
                .fadeIn(200)
                .fadeOut(400);
        }

        // projectile — flies from caster toward the template origin
        if (projectile && casterToken) {
            seq.effect()
                .file(projectile)
                .atLocation(casterToken)
                .stretchTo({ x: tX, y: tY })
                .missed(false);
        }

        seq.play();

    } catch (e) {
        console.debug("PF2e Heuristic | Template animation hook error (non-fatal):", e.message);
    }
});
