/**
 * Console test script for Phase K4 (attack-roll/strike animation hook).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v8.2.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This exercises the new data tables and resolver functions directly with
 * mock weapon items/contexts - it does not require an actual strike, so it
 * works regardless of the "enableStrikeAnimations" setting.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase K4 Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    const requiredFns = ["resolveStrikeAnimationAsset", "getWeaponTreeKeys", "getStrikeRangeKind", "executeHeuristicAnimation"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v8.2.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    try {
        pass(`PF2E_STRIKE_TREES is available (bySlug=${Object.keys(PF2E_STRIKE_TREES.bySlug).length}, byBase=${Object.keys(PF2E_STRIKE_TREES.byBase).length}, byGroup=${Object.keys(PF2E_STRIKE_TREES.byGroup).length})`);
    } catch (e) {
        fail("PF2E_STRIKE_TREES not found", e.message);
    }

    // ----------------------------------------------------
    // 1. getWeaponTreeKeys() / getStrikeRangeKind()
    // ----------------------------------------------------
    console.log("%c--- 1. Weapon key/range derivation ---", "color:#9900ff;font-weight:bold;");

    const mockClaws = {
        type: "melee",
        name: "Claws",
        slug: "claws",
        system: { traits: { value: ["agile", "finesse", "unarmed"] }, range: null, actions: { value: 1 } }
    };
    const clawsKeys = getWeaponTreeKeys(mockClaws);
    log("getWeaponTreeKeys(claws)", clawsKeys);
    if (clawsKeys.slug === "claws") {
        pass('getWeaponTreeKeys(claws).slug === "claws"');
    } else {
        fail("getWeaponTreeKeys(claws).slug unexpected", clawsKeys.slug);
    }

    const clawsRange = getStrikeRangeKind(mockClaws, new Set());
    if (clawsRange === "melee") {
        pass('getStrikeRangeKind(claws, {}) === "melee" (no range, defaults melee)');
    } else {
        fail("getStrikeRangeKind(claws) unexpected", clawsRange);
    }

    const mockCrossbow = {
        type: "weapon",
        name: "Crossbow",
        slug: "crossbow",
        system: {
            traits: { value: [] },
            baseItem: "crossbow",
            group: "crossbow",
            range: { value: 60 },
            actions: { value: 1 }
        }
    };
    const crossbowKeys = getWeaponTreeKeys(mockCrossbow);
    log("getWeaponTreeKeys(crossbow)", crossbowKeys);
    if (crossbowKeys.baseType === "crossbow" && crossbowKeys.group === "crossbow") {
        pass("getWeaponTreeKeys(crossbow) derived baseType and group");
    } else {
        fail("getWeaponTreeKeys(crossbow) missing baseType/group", crossbowKeys);
    }

    const crossbowRange = getStrikeRangeKind(mockCrossbow, new Set(["ranged"]));
    if (crossbowRange === "ranged") {
        pass('getStrikeRangeKind(crossbow, {ranged}) === "ranged"');
    } else {
        fail("getStrikeRangeKind(crossbow) unexpected", crossbowRange);
    }

    // ----------------------------------------------------
    // 2. resolveStrikeAnimationAsset() - bySlug (claws, no predicate)
    // ----------------------------------------------------
    console.log("%c--- 2. resolveStrikeAnimationAsset(): bySlug ---", "color:#9900ff;font-weight:bold;");

    log("PF2E_STRIKE_TREES.bySlug['claws']", PF2E_STRIKE_TREES.bySlug["claws"]);

    const emptyCtx = { facts: new Set(), values: {} };
    const clawsImpact = resolveStrikeAnimationAsset(clawsKeys, "attack-roll", "impact", emptyCtx);
    log('resolveStrikeAnimationAsset(claws, "attack-roll", "impact", {})', clawsImpact);

    if (clawsImpact === "jb2a.claws.400px.red" || clawsImpact === null) {
        pass(`claws impact resolved to ${clawsImpact === null ? "null (asset not installed - expected if jb2a free-tier lacks this path)" : `"${clawsImpact}"`}`);
    } else {
        fail("claws impact resolved to unexpected file", clawsImpact);
    }

    // ----------------------------------------------------
    // 3. resolveStrikeAnimationAsset() - byGroup (crossbow, jb2a:patreon-gated)
    // ----------------------------------------------------
    console.log("%c--- 3. resolveStrikeAnimationAsset(): byGroup ---", "color:#9900ff;font-weight:bold;");

    log("PF2E_STRIKE_TREES.byGroup['crossbow']", PF2E_STRIKE_TREES.byGroup["crossbow"]);

    const patreonCtx = { facts: new Set(["jb2a:patreon"]), values: {} };
    const noPatreonCtx = { facts: new Set(["jb2a:free"]), values: {} };

    const crossbowProjectileNoPatreon = resolveStrikeAnimationAsset(crossbowKeys, "attack-roll", "projectile", noPatreonCtx);
    const crossbowProjectileWithPatreon = resolveStrikeAnimationAsset(crossbowKeys, "attack-roll", "projectile", patreonCtx);
    log('resolveStrikeAnimationAsset(crossbow, "attack-roll", "projectile", {jb2a:free})', crossbowProjectileNoPatreon);
    log('resolveStrikeAnimationAsset(crossbow, "attack-roll", "projectile", {jb2a:patreon})', crossbowProjectileWithPatreon);

    if (crossbowProjectileNoPatreon === null) {
        pass('Without "jb2a:patreon", crossbow projectile (predicate ["jb2a:patreon"]) correctly does not match');
    } else {
        fail("crossbow projectile resolved without jb2a:patreon (predicate should have excluded it)", crossbowProjectileNoPatreon);
    }

    if (crossbowProjectileWithPatreon === "jb2a.bolt.physical.white02" || crossbowProjectileWithPatreon === null) {
        pass(`With "jb2a:patreon", crossbow projectile resolved to ${crossbowProjectileWithPatreon === null ? "null (asset not installed)" : `"${crossbowProjectileWithPatreon}"`}`);
    } else {
        fail("crossbow projectile resolved to unexpected file", crossbowProjectileWithPatreon);
    }

    // ----------------------------------------------------
    // 4. Unknown weapon - resolves to null cleanly
    // ----------------------------------------------------
    console.log("%c--- 4. Unknown weapon ---", "color:#9900ff;font-weight:bold;");

    const unknownKeys = { slug: "totally-not-a-real-weapon", baseType: null, group: null };
    const unknownResult = resolveStrikeAnimationAsset(unknownKeys, "attack-roll", "impact", emptyCtx);
    if (unknownResult === null) {
        pass("Unknown weapon correctly resolves to null");
    } else {
        fail("Unknown weapon unexpectedly resolved", unknownResult);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
    console.log("%cNote: To test the live createChatMessage hook, enable \"Enable Strike Animations (Beta)\" in module settings, then roll a weapon Strike with a controlled token.", "color:#888888;");
})();
