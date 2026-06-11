/**
 * Console test script for Phase K1/K2 (predicate evaluation engine +
 * predicate-tree animation data/resolver).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v8.0.0 active) and paste this
 * whole script in, then press Enter.
 *
 * Note: K1/K2 are purely additive - nothing here changes cast animations.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase K1/K2 Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    const requiredFns = ["evaluatePredicate", "buildPredicateContext", "resolveAnimationTreeAsset"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v8.0.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }
    // NOTE: PF2E_ANIMATION_TREES is a top-level `const`, which is a global
    // lexical binding, not a property of globalThis - so it must be checked
    // directly rather than via globalThis.
    try {
        pass(`PF2E_ANIMATION_TREES is available (${Object.keys(PF2E_ANIMATION_TREES).length} slugs)`);
    } catch (e) {
        fail("PF2E_ANIMATION_TREES not found", e.message);
    }

    // ----------------------------------------------------
    // 1. evaluatePredicate() - basic statement shapes
    // ----------------------------------------------------
    console.log("%c--- 1. evaluatePredicate() basics ---", "color:#9900ff;font-weight:bold;");

    const ctx1 = { facts: new Set(["item:trait:fire", "melee"]), values: { "settings:quality": 1 } };

    const checks1 = [
        [["item:trait:fire"], true, "single matching string fact"],
        [["item:trait:cold"], false, "single non-matching string fact"],
        [["item:trait:fire", "melee"], true, "implicit AND, both match"],
        [["item:trait:fire", "ranged"], false, "implicit AND, one fails"],
        [[{ not: "item:trait:cold" }], true, "not of a non-matching fact"],
        [[{ not: "item:trait:fire" }], false, "not of a matching fact"],
        [[{ or: ["item:trait:cold", "melee"] }], true, "or with one match"],
        [[{ or: ["item:trait:cold", "ranged"] }], false, "or with no match"],
        [[{ nor: ["item:trait:cold", "ranged"] }], true, "nor with no matches"],
        [[{ nor: ["item:trait:cold", "melee"] }], false, "nor with one match"],
        [[{ gte: ["settings:quality", 1] }], true, "gte at threshold"],
        [[{ gte: ["settings:quality", 2] }], false, "gte above value"],
        [[{ lte: ["settings:quality", 1] }], true, "lte at threshold"],
        [[], true, "empty predicate always matches"],
        [undefined, true, "undefined predicate always matches"],
    ];

    for (const [predicate, expected, label] of checks1) {
        const result = evaluatePredicate(predicate, ctx1);
        if (result === expected) {
            pass(`evaluatePredicate: ${label} -> ${result}`);
        } else {
            fail(`evaluatePredicate: ${label}`, { predicate, expected, got: result });
        }
    }

    // ----------------------------------------------------
    // 2. buildPredicateContext() - static facts from a mock item
    // ----------------------------------------------------
    console.log("%c--- 2. buildPredicateContext() ---", "color:#9900ff;font-weight:bold;");

    const mockMeleeWeapon = {
        type: "weapon",
        system: {
            traits: { value: ["fire", "magical"] },
            range: null,
            actions: { value: 2 }
        }
    };
    const meleeCtx = buildPredicateContext(mockMeleeWeapon);
    log("buildPredicateContext(mockMeleeWeapon)", { facts: [...meleeCtx.facts], values: meleeCtx.values });

    const expectedFacts = ["item:trait:fire", "item:trait:magical", "melee", "action:cost:2"];
    const missingFacts = expectedFacts.filter(f => !meleeCtx.facts.has(f));
    if (missingFacts.length === 0) {
        pass("buildPredicateContext derived expected static facts for a melee weapon");
    } else {
        fail("buildPredicateContext missing expected facts", missingFacts);
    }

    if (meleeCtx.facts.has("jb2a:patreon") || meleeCtx.facts.has("jb2a:free")) {
        pass(`buildPredicateContext set an asset-availability fact (${meleeCtx.facts.has("jb2a:patreon") ? "jb2a:patreon" : "jb2a:free"})`);
    } else {
        fail("buildPredicateContext did not set jb2a:patreon or jb2a:free");
    }

    if (typeof meleeCtx.values["settings:quality"] === "number") {
        pass(`buildPredicateContext set settings:quality = ${meleeCtx.values["settings:quality"]}`);
    } else {
        fail("buildPredicateContext did not set settings:quality");
    }

    const mockRangedWeapon = {
        type: "weapon",
        system: { traits: { value: ["thrown"] }, range: { value: 20 } }
    };
    const rangedCtx = buildPredicateContext(mockRangedWeapon);
    if (rangedCtx.facts.has("ranged") && rangedCtx.facts.has("thrown") && !rangedCtx.facts.has("melee")) {
        pass("buildPredicateContext correctly derived ranged+thrown for a thrown ranged weapon");
    } else {
        fail("buildPredicateContext ranged/thrown derivation incorrect", [...rangedCtx.facts]);
    }

    // ----------------------------------------------------
    // 3. resolveAnimationTreeAsset() - parity check against acid-splash
    // ----------------------------------------------------
    console.log("%c--- 3. resolveAnimationTreeAsset() ---", "color:#9900ff;font-weight:bold;");

    log("PF2E_ANIMATION_TREES['acid-splash']", PF2E_ANIMATION_TREES["acid-splash"]);

    // acid-splash candidates require "jb2a:patreon" - build a context that
    // satisfies it regardless of the actual installed module, to confirm the
    // resolver's predicate + validation logic independent of asset library.
    const patreonCtx = { facts: new Set(["jb2a:patreon"]), values: {} };
    const noPatreonCtx = { facts: new Set(["jb2a:free"]), values: {} };

    const projectileWithPatreon = resolveAnimationTreeAsset("acid-splash", "attack-roll", "projectile", patreonCtx);
    log('resolveAnimationTreeAsset("acid-splash", "attack-roll", "projectile", {jb2a:patreon})', projectileWithPatreon);

    const projectileWithoutPatreon = resolveAnimationTreeAsset("acid-splash", "attack-roll", "projectile", noPatreonCtx);
    log('resolveAnimationTreeAsset("acid-splash", "attack-roll", "projectile", {jb2a:free})', projectileWithoutPatreon);

    if (projectileWithoutPatreon === null) {
        pass('Without "jb2a:patreon" in context, acid-splash projectile candidate (predicate ["jb2a:patreon"]) correctly does not match');
    } else {
        fail('acid-splash projectile resolved without "jb2a:patreon" in context (predicate should have excluded it)', projectileWithoutPatreon);
    }

    if (projectileWithPatreon === "jb2a.fire_bolt.green" || projectileWithPatreon === null) {
        pass(`With "jb2a:patreon" in context, acid-splash projectile resolved to ${projectileWithPatreon === null ? "null (asset not installed - expected if jb2a_patreon module absent)" : `"${projectileWithPatreon}"`}`);
    } else {
        fail("acid-splash projectile resolved to unexpected file", projectileWithPatreon);
    }

    // Unknown slug / role
    const unknown = resolveAnimationTreeAsset("totally-not-a-real-spell", "attack-roll", "projectile", patreonCtx);
    if (unknown === null) {
        pass("Unknown slug correctly resolves to null");
    } else {
        fail("Unknown slug unexpectedly resolved", unknown);
    }

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
