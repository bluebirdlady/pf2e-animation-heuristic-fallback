// ============================================================
// CORE: Attack-roll (strike) animation hook (Phase K4). The first non-spell
// trigger - hooks createChatMessage for PF2e attack-roll chat cards (weapon
// strikes, plus a small number of class/creature abilities that use the
// attack-roll trigger), resolves projectile/impact assets via
// resolveStrikeAnimationAsset() / resolveAnimationTreeAsset(), and plays them
// through the existing executeHeuristicAnimation() pipeline. Depends on
// settings.js, core/predicate-engine.js, core/animation-tree-resolver.js and
// core/animation-executor.js.
//
// Gated behind "enableStrikeAnimations" (default off, beta). Saving-throw,
// damage-taken, toggle, and place-template triggers are out of scope for
// this phase (future K5+).
// ============================================================

// Derives { slug, baseType, group } for a weapon/strike item, used to look
// up PF2E_STRIKE_TREES.bySlug/byBase/byGroup in priority order.
function getWeaponTreeKeys(item) {
    const slug = getSpellSlug(item);
    const baseType = item?.system?.baseItem || null;
    const groupRaw = item?.system?.group;
    const group = (typeof groupRaw === "string") ? groupRaw : (groupRaw?.value || null);
    return { slug, baseType, group };
}

// Derives "melee"/"ranged" for a strike, preferring the roll's own options
// (which reflect e.g. a thrown weapon's actual usage), then the item's
// declared range/weaponType, defaulting to "melee".
function getStrikeRangeKind(item, rollOptions) {
    if (rollOptions?.has?.("ranged") || (Array.isArray(rollOptions) && rollOptions.includes("ranged"))) return "ranged";
    if (rollOptions?.has?.("melee") || (Array.isArray(rollOptions) && rollOptions.includes("melee"))) return "melee";

    if (item?.system?.range?.value || item?.system?.range?.max) return "ranged";
    const weaponType = item?.system?.weaponType?.value || item?.system?.weaponType;
    if (weaponType === "ranged") return "ranged";

    return "melee";
}

Hooks.off("createChatMessage", globalThis._pf2eHeuristicStrikeHookId);

globalThis._pf2eHeuristicStrikeHookId = Hooks.on("createChatMessage", (message, options, userId) => {
    if (userId !== game.user.id) return;
    console.log(`%cPF2E HEURISTIC [K4 diag] %c| Strike hook: enable=${getSettingSafe("enable")} enableStrikeAnimations=${getSettingSafe("enableStrikeAnimations")}`, "color:#ff9900;font-weight:bold;", "color:#cccccc;");
    if (!getSettingSafe("enable")) return;
    if (!getSettingSafe("enableStrikeAnimations")) return;

    try {
        const context = message.flags?.pf2e?.context;
        console.log(`%cPF2E HEURISTIC [K4 diag] %c| createChatMessage fired | context.type="${context?.type}" | userId match=${userId === game.user.id}`, "color:#ff9900;font-weight:bold;", "color:#cccccc;");
        if (!context || context.type !== "attack-roll") return;

        const item = message.item;
        console.log(`%cPF2E HEURISTIC [K4 diag] %c| context.type=attack-roll | item=${item?.name} (type=${item?.type})`, "color:#ff9900;font-weight:bold;", "color:#cccccc;");
        if (!item) return;
        if (!["weapon", "melee", "action", "feat"].includes(item.type)) return;

        const token = message.actor?.getActiveTokens()?.[0] || canvas.tokens?.controlled?.[0];
        console.log(`%cPF2E HEURISTIC [K4 diag] %c| item type ok | token=${token?.name}`, "color:#ff9900;font-weight:bold;", "color:#cccccc;");
        if (!token) return;

        const rollOptions = context.options;
        const rangeKind = getStrikeRangeKind(item, rollOptions);
        const weaponKeys = getWeaponTreeKeys(item);

        const strikeContext = buildPredicateContext(item, {
            rangeKind,
            actionCost: item.system?.actions?.value,
            facts: rollOptions
        });

        const resolveRole = (role) =>
            resolveStrikeAnimationAsset(weaponKeys, "attack-roll", role, strikeContext)
            || resolveAnimationTreeAsset(weaponKeys.slug, "attack-roll", role, strikeContext);

        const projectile = resolveRole("projectile");
        const impact = resolveRole("impact");

        console.log(`%cPF2E HEURISTIC [K4 diag] %c| weaponKeys=${JSON.stringify(weaponKeys)} rangeKind=${rangeKind} | resolved projectile="${projectile}" impact="${impact}"`, "color:#ff9900;font-weight:bold;", "color:#cccccc;");
        if (!projectile && !impact) return;

        const animationConfig = {
            color: "blue",
            type: rangeKind === "ranged" ? "projectile" : "melee",
            blend: false,
            projectile,
            impact,
            pf2eGraphicsSlug: weaponKeys.slug
        };

        const mockSpell = {
            name: item.name,
            slug: weaponKeys.slug,
            system: { traits: { value: [] } }
        };

        console.log(`%cPF2E HEURISTIC %c| Strike animation for: "${item.name}" (${rangeKind})`, "color: #00ffcc; font-weight: bold;", "color: #ffffff;");
        executeHeuristicAnimation(mockSpell, token, animationConfig);
    } catch (e) {
        console.log(`%cPF2E HEURISTIC [K4 diag] %c| Strike hook caught error: ${e.message}`, "color:#ff3333;font-weight:bold;", "color:#cccccc;", e);
    }
});
