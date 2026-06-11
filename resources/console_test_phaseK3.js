/**
 * Console test script for Phase K3 (predicate-tree resolution wired into
 * parseSpellToAnimation()).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v8.1.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This exercises parseSpellToAnimation() against mock spell items, so it
 * does not require any actual cast. It checks:
 *   - buildPredicateContext() sets both "ranged"/"item:ranged" forms
 *   - "ignition" (whose tree entries use "item:ranged"/"item:melee") now
 *     resolves projectile/impact via the predicate tree
 *   - "acid-splash" still resolves (parity with Phase J / legacy map)
 *   - config.pf2eGraphicsSlug is set whenever an override applied
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase K3 Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    if (typeof parseSpellToAnimation !== "function") {
        fail('Global function "parseSpellToAnimation" not found', "Is the module active and loaded at v8.1.0?");
        return;
    }
    pass('Global function "parseSpellToAnimation" is available');

    // ----------------------------------------------------
    // 1. buildPredicateContext() - "item:" alias forms (K3 fix)
    // ----------------------------------------------------
    console.log("%c--- 1. buildPredicateContext() item:ranged/item:melee aliasing ---", "color:#9900ff;font-weight:bold;");

    const rangedCtx = buildPredicateContext({ type: "spell", system: { traits: { value: [] } } }, { rangeKind: "ranged" });
    if (rangedCtx.facts.has("ranged") && rangedCtx.facts.has("item:ranged")) {
        pass('buildPredicateContext({rangeKind:"ranged"}) sets both "ranged" and "item:ranged"');
    } else {
        fail('buildPredicateContext({rangeKind:"ranged"}) missing alias facts', [...rangedCtx.facts]);
    }

    const meleeCtx = buildPredicateContext({ type: "spell", system: { traits: { value: [] } } }, { rangeKind: "melee" });
    if (meleeCtx.facts.has("melee") && meleeCtx.facts.has("item:melee")) {
        pass('buildPredicateContext({rangeKind:"melee"}) sets both "melee" and "item:melee"');
    } else {
        fail('buildPredicateContext({rangeKind:"melee"}) missing alias facts', [...meleeCtx.facts]);
    }

    // ----------------------------------------------------
    // 2. parseSpellToAnimation("ignition") - tree-based resolution
    // ----------------------------------------------------
    console.log("%c--- 2. parseSpellToAnimation: ignition (item:ranged predicates) ---", "color:#9900ff;font-weight:bold;");

    const mockIgnition = {
        slug: "ignition",
        name: "Ignition",
        system: {
            traits: { value: ["fire", "evocation"] },
            area: null,
            range: null,
            actions: { value: 1 },
            description: { value: "You ignite the target with searing flame." }
        }
    };

    const ignitionConfig = parseSpellToAnimation(mockIgnition);
    log("parseSpellToAnimation(ignition)", ignitionConfig);

    if (ignitionConfig.pf2eGraphicsSlug === "ignition") {
        pass('ignition: config.pf2eGraphicsSlug === "ignition" (an override applied)');
    } else {
        fail("ignition: pf2eGraphicsSlug not set - no PF2e Graphics override applied", ignitionConfig.pf2eGraphicsSlug);
    }

    // The tree's item:ranged-gated candidates are jb2a.fire_bolt.orange
    // (projectile) and jb2a.cast_generic.fire.side01.orange.0 (impact). If
    // those validate, the tree resolver should win over the legacy map.
    log("ignition projectile", ignitionConfig.projectile);
    log("ignition impact", ignitionConfig.impact);

    if (ignitionConfig.projectile && ignitionConfig.projectile !== ignitionConfig.castRing) {
        pass(`ignition: projectile resolved to "${ignitionConfig.projectile}"`);
    } else {
        fail("ignition: projectile not resolved", ignitionConfig.projectile);
    }

    if (ignitionConfig.impact) {
        pass(`ignition: impact resolved to "${ignitionConfig.impact}"`);
    } else {
        fail("ignition: impact not resolved", ignitionConfig.impact);
    }

    // ----------------------------------------------------
    // 3. parseSpellToAnimation("acid-splash") - parity with Phase J
    // ----------------------------------------------------
    console.log("%c--- 3. parseSpellToAnimation: acid-splash (parity check) ---", "color:#9900ff;font-weight:bold;");

    const mockAcidSplash = {
        slug: "acid-splash",
        name: "Acid Splash",
        system: {
            traits: { value: ["acid", "conjuration"] },
            area: null,
            range: { value: 30 },
            actions: { value: 2 },
            description: { value: "You splash a glob of acid that splatters your target and nearby creatures." }
        }
    };

    const acidConfig = parseSpellToAnimation(mockAcidSplash);
    log("parseSpellToAnimation(acid-splash)", acidConfig);

    if (acidConfig.pf2eGraphicsSlug === "acid-splash") {
        pass('acid-splash: config.pf2eGraphicsSlug === "acid-splash" (an override applied)');
    } else {
        fail("acid-splash: pf2eGraphicsSlug not set - no PF2e Graphics override applied (unexpected regression vs Phase J)", acidConfig.pf2eGraphicsSlug);
    }

    log("acid-splash projectile", acidConfig.projectile);
    log("acid-splash impact", acidConfig.impact);

    // ----------------------------------------------------
    // 4. Unmapped spell - heuristic config unaffected
    // ----------------------------------------------------
    console.log("%c--- 4. parseSpellToAnimation: unmapped spell (no PF2e Graphics entry) ---", "color:#9900ff;font-weight:bold;");

    const mockUnmapped = {
        slug: "totally-not-a-real-spell",
        name: "Totally Not A Real Spell",
        system: {
            traits: { value: ["arcane"] },
            area: null,
            range: { value: 30 },
            actions: { value: 2 },
            description: { value: "A made-up spell with no PF2e Graphics data." }
        }
    };

    const unmappedConfig = parseSpellToAnimation(mockUnmapped);
    log("parseSpellToAnimation(totally-not-a-real-spell)", unmappedConfig);

    if (unmappedConfig.pf2eGraphicsSlug === undefined) {
        pass("unmapped spell: no pf2eGraphicsSlug set, heuristic config untouched");
    } else {
        fail("unmapped spell: pf2eGraphicsSlug unexpectedly set", unmappedConfig.pf2eGraphicsSlug);
    }

    if (unmappedConfig.projectile) {
        pass(`unmapped spell: heuristic projectile still resolved ("${unmappedConfig.projectile}")`);
    } else {
        fail("unmapped spell: heuristic projectile missing", unmappedConfig.projectile);
    }

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
