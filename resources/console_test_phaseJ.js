/**
 * Console test script for Phase J (PF2e Graphics Asset Import).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.11.0 active) and paste this
 * whole script in, then press Enter.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase J Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    const requiredFns = ["parseSpellToAnimation", "resolvePf2eGraphicsAsset", "reportPf2eGraphicsCoverage", "getSpellSlug"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.11.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    // ----------------------------------------------------
    // 1. resolvePf2eGraphicsAsset() basic resolution
    // ----------------------------------------------------
    console.log("%c--- 1. resolvePf2eGraphicsAsset() ---", "color:#9900ff;font-weight:bold;");

    const acidSplashProjectile = resolvePf2eGraphicsAsset("acid-splash", "projectile");
    log('resolvePf2eGraphicsAsset("acid-splash", "projectile")', acidSplashProjectile);
    if (acidSplashProjectile) {
        pass(`"acid-splash" projectile resolved: "${acidSplashProjectile}"`);
    } else {
        fail('"acid-splash" projectile did not resolve (check jb2a.fire_bolt.green availability)');
    }

    const unknownSlug = resolvePf2eGraphicsAsset("totally-not-a-real-spell", "projectile");
    log('resolvePf2eGraphicsAsset("totally-not-a-real-spell", "projectile")', unknownSlug);
    if (unknownSlug === null) {
        pass("Unknown slug correctly resolves to null");
    } else {
        fail("Unknown slug unexpectedly resolved", unknownSlug);
    }

    // ----------------------------------------------------
    // 2. parseSpellToAnimation() override - projectile + impact (acid-splash)
    // ----------------------------------------------------
    console.log("%c--- 2. parseSpellToAnimation() override (acid-splash) ---", "color:#9900ff;font-weight:bold;");

    const mockAcidSplash = {
        name: "Acid Splash",
        slug: "acid-splash",
        system: {
            description: { value: "You splash a glob of acid." },
            traits: { value: ["acid", "attack", "cantrip", "conjuration"] },
            area: null
        }
    };
    const acidConfig = parseSpellToAnimation(mockAcidSplash);
    log("parseSpellToAnimation(mockAcidSplash)", acidConfig);
    if (acidConfig.pf2eGraphicsSlug === "acid-splash" && acidConfig.projectile === "jb2a.fire_bolt.green" && acidConfig.impact === "jb2a.liquid.splash.green") {
        pass("Acid Splash projectile/impact overridden with PF2e Graphics assets");
    } else {
        fail("Acid Splash did not get expected PF2e Graphics overrides", acidConfig);
    }

    // ----------------------------------------------------
    // 3. parseSpellToAnimation() override - cone areaEffect (chilling-spray)
    // ----------------------------------------------------
    console.log("%c--- 3. parseSpellToAnimation() override (chilling-spray, cone) ---", "color:#9900ff;font-weight:bold;");

    const mockChillingSpray = {
        name: "Chilling Spray",
        slug: "chilling-spray",
        system: {
            description: { value: "You spray frigid water in a cone." },
            traits: { value: ["cold", "evocation"] },
            area: { type: "cone", value: 15 }
        }
    };
    const chillingConfig = parseSpellToAnimation(mockChillingSpray);
    log("parseSpellToAnimation(mockChillingSpray)", chillingConfig);
    if (chillingConfig.type === "cone" && chillingConfig.areaEffect === "jb2a.cone_of_cold.blue" && chillingConfig.pf2eGraphicsSlug === "chilling-spray") {
        pass("Chilling Spray cone areaEffect overridden with PF2e Graphics asset");
    } else {
        fail("Chilling Spray did not get expected PF2e Graphics areaEffect override", chillingConfig);
    }

    // ----------------------------------------------------
    // 4. parseSpellToAnimation() override - burst groundRing (toxic-cloud)
    // ----------------------------------------------------
    console.log("%c--- 4. parseSpellToAnimation() override (toxic-cloud, burst) ---", "color:#9900ff;font-weight:bold;");

    const mockToxicCloud = {
        name: "Toxic Cloud",
        slug: "toxic-cloud",
        system: {
            description: { value: "You create a lingering cloud of poison." },
            traits: { value: ["poison", "conjuration"] },
            area: { type: "burst", value: 20 }
        }
    };
    const toxicConfig = parseSpellToAnimation(mockToxicCloud);
    log("parseSpellToAnimation(mockToxicCloud)", toxicConfig);
    if (toxicConfig.type === "burst" && toxicConfig.groundRing === "jb2a.darkness.green" && toxicConfig.pf2eGraphicsSlug === "toxic-cloud") {
        pass("Toxic Cloud burst groundRing overridden with PF2e Graphics asset");
    } else {
        fail("Toxic Cloud did not get expected PF2e Graphics groundRing override", toxicConfig);
    }

    // ----------------------------------------------------
    // 5. Spell with no PF2e Graphics entry falls back to heuristics
    //    unchanged (no pf2eGraphicsSlug set)
    // ----------------------------------------------------
    console.log("%c--- 5. Unmapped spell unaffected ---", "color:#9900ff;font-weight:bold;");

    const mockUnmapped = {
        name: "Console Test Totally Unmapped Spell",
        slug: "console-test-totally-unmapped-spell",
        system: {
            description: { value: "A generic fire effect." },
            traits: { value: ["fire", "evocation"] },
            area: null
        }
    };
    const unmappedConfig = parseSpellToAnimation(mockUnmapped);
    log("parseSpellToAnimation(mockUnmapped)", unmappedConfig);
    if (!unmappedConfig.pf2eGraphicsSlug) {
        pass("Unmapped spell has no pf2eGraphicsSlug set, heuristic config unchanged");
    } else {
        fail("Unmapped spell unexpectedly got a pf2eGraphicsSlug", unmappedConfig);
    }

    // ----------------------------------------------------
    // 6. Setting toggle - disabling usePf2eGraphicsAssets restores heuristic
    //    asset for a mapped spell
    // ----------------------------------------------------
    console.log("%c--- 6. usePf2eGraphicsAssets setting toggle ---", "color:#9900ff;font-weight:bold;");

    let originalSetting;
    try {
        originalSetting = game.settings.get("pf2e-heuristic-fallback", "usePf2eGraphicsAssets");
    } catch (e) {
        originalSetting = true;
    }

    try {
        await game.settings.set("pf2e-heuristic-fallback", "usePf2eGraphicsAssets", false);
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", false);

        const acidConfigDisabled = parseSpellToAnimation(mockAcidSplash);
        log("parseSpellToAnimation(mockAcidSplash) with override disabled", acidConfigDisabled);
        if (!acidConfigDisabled.pf2eGraphicsSlug && acidConfigDisabled.projectile !== "jb2a.fire_bolt.green") {
            pass("With usePf2eGraphicsAssets disabled, Acid Splash falls back to heuristic asset");
        } else if (!acidConfigDisabled.pf2eGraphicsSlug) {
            pass("With usePf2eGraphicsAssets disabled, no PF2e Graphics override applied (heuristic asset happened to match)");
        } else {
            fail("PF2e Graphics override still applied with setting disabled", acidConfigDisabled);
        }
    } finally {
        await game.settings.set("pf2e-heuristic-fallback", "usePf2eGraphicsAssets", originalSetting);
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", true);
    }

    // ----------------------------------------------------
    // 7. Coverage report (informational)
    // ----------------------------------------------------
    console.log("%c--- 7. Coverage report ---", "color:#9900ff;font-weight:bold;");
    await reportPf2eGraphicsCoverage();
    pass("reportPf2eGraphicsCoverage() completed without throwing");

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
