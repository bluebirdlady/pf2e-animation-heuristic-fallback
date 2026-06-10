/**
 * Console test script for Part 1.2 (Asset Fallback Chains) and
 * Phase A (Curated Spell Support).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.2.0 active) and paste this
 * whole script in, then press Enter.
 *
 * The module's top-level functions are loaded as a classic (non-module)
 * script, so they are available as globals: resolveVerifiedAssetPath,
 * resolveAssetWithFallback, isValidSequencerPath, getCuratedSpellSet,
 * parseSpellToAnimation, executeHeuristicAnimation, ASSET_FALLBACK_CHAIN,
 * EXPLICIT_DATABASE_MAP.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Part 1.2 + Phase A Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = [
        "isValidSequencerPath",
        "resolveVerifiedAssetPath",
        "resolveAssetWithFallback",
        "getCuratedSpellSet",
        "parseSpellToAnimation",
        "executeHeuristicAnimation"
    ];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    // --------------------------------------------------------
    // 1. isValidSequencerPath()
    // --------------------------------------------------------
    console.log("%c--- 1. isValidSequencerPath ---", "color:#9900ff;font-weight:bold;");
    const knownGoodPath = "jb2a.fire_bolt.orange";
    const knownBadPath = "jb2a.totally_fake_effect.does_not_exist.xyz";

    const goodResult = isValidSequencerPath(knownGoodPath);
    log(`isValidSequencerPath("${knownGoodPath}")`, goodResult);
    goodResult ? pass("Known-good path validated") : fail("Known-good path failed validation", "Check JB2A is installed/active");

    const badResult = isValidSequencerPath(knownBadPath);
    log(`isValidSequencerPath("${knownBadPath}")`, badResult);
    !badResult ? pass("Known-bad path correctly rejected") : fail("Known-bad path incorrectly validated");

    // --------------------------------------------------------
    // 2. resolveVerifiedAssetPath() - unchanged behavior
    // --------------------------------------------------------
    console.log("%c--- 2. resolveVerifiedAssetPath (existing behavior) ---", "color:#9900ff;font-weight:bold;");
    for (const [assetType, color] of [["projectile", "orange"], ["impact", "blue"], ["castRing", "blue"]]) {
        const result = resolveVerifiedAssetPath(assetType, color);
        log(`resolveVerifiedAssetPath("${assetType}", "${color}")`, result);
    }

    // --------------------------------------------------------
    // 3. resolveAssetWithFallback() - new in Part 1.2
    // --------------------------------------------------------
    console.log("%c--- 3. resolveAssetWithFallback (Part 1.2) ---", "color:#9900ff;font-weight:bold;");

    // Normal case: should match what resolveVerifiedAssetPath returns when EXPLICIT_DATABASE_MAP has a hit
    for (const [assetType, color] of [["projectile", "orange"], ["impact", "purple"], ["tokenBuff", "holy"]]) {
        const direct = resolveVerifiedAssetPath(assetType, color);
        const withFallback = resolveAssetWithFallback(assetType, color);
        log(`resolveAssetWithFallback("${assetType}", "${color}")`, withFallback);
        if (direct) {
            (withFallback === direct)
                ? pass(`"${assetType}"/"${color}" matches direct resolution when explicit map hits`)
                : fail(`"${assetType}"/"${color}" mismatch`, { direct, withFallback });
        } else {
            console.log(`%c  (explicit map had no match for "${assetType}"/"${color}" - fallback chain ${withFallback ? "produced" : "also produced no"} result)`, "color:#888888;");
        }
    }

    // Force a fallback-chain hit: use a color unlikely to be in EXPLICIT_DATABASE_MAP patterns
    // but plausible for the generic ASSET_FALLBACK_CHAIN generators.
    const exoticColor = "dark_purple";
    for (const assetType of Object.keys(ASSET_FALLBACK_CHAIN)) {
        const direct = resolveVerifiedAssetPath(assetType, exoticColor);
        const withFallback = resolveAssetWithFallback(assetType, exoticColor);
        log(`[exotic color] resolveAssetWithFallback("${assetType}", "${exoticColor}")`, withFallback);
        if (!direct && withFallback) {
            pass(`"${assetType}"/"${exoticColor}" recovered via ASSET_FALLBACK_CHAIN`);
        } else if (direct) {
            console.log(`%c  (explicit map already covered "${assetType}"/"${exoticColor}", fallback chain not exercised)`, "color:#888888;");
        } else {
            console.log(`%c  (no result from either explicit map or fallback chain for "${assetType}"/"${exoticColor}")`, "color:#888888;");
        }
    }

    // Graceful failure: completely bogus asset type should return null without throwing
    try {
        const bogus = resolveAssetWithFallback("notARealAssetType", "blue");
        (bogus === null) ? pass("Unknown asset type returns null") : fail("Unknown asset type did not return null", bogus);
    } catch (e) {
        fail("resolveAssetWithFallback threw on unknown asset type", e);
    }

    // --------------------------------------------------------
    // 4. getCuratedSpellSet() - Phase A
    // --------------------------------------------------------
    console.log("%c--- 4. getCuratedSpellSet (Phase A) ---", "color:#9900ff;font-weight:bold;");
    const curatedSet = getCuratedSpellSet();
    log("Curated spell set size", curatedSet.size);
    if (curatedSet.size > 0) {
        log("Sample curated slugs", Array.from(curatedSet).slice(0, 10));
        pass("Curated spell set populated (pf2e-jb2a-macros active with indexed macros)");
    } else {
        console.log("%c  (Empty set: pf2e-jb2a-macros not active/installed, or pack has no Macro entries - this is a valid graceful-degradation state)", "color:#888888;");
    }

    // Re-call to confirm caching (should be the same Set instance)
    const curatedSet2 = getCuratedSpellSet();
    (curatedSet === curatedSet2) ? pass("getCuratedSpellSet() result is cached (same Set instance)") : fail("getCuratedSpellSet() did not return cached instance");

    // --------------------------------------------------------
    // 5. parseSpellToAnimation() - curated bypass + normal routing
    // --------------------------------------------------------
    console.log("%c--- 5. parseSpellToAnimation (curated bypass + normal routing) ---", "color:#9900ff;font-weight:bold;");

    // 5a. A spell that should NOT be curated - normal heuristic config expected
    const mockUncurated = {
        name: "Definitely Not A Real Curated Spell Name 12345",
        slug: "definitely-not-a-real-curated-spell-name-12345",
        system: { description: { value: "A bolt of fire shoots from your hand." }, traits: { value: ["fire", "evocation"] } }
    };
    const uncuratedConfig = parseSpellToAnimation(mockUncurated);
    log("parseSpellToAnimation(mockUncurated)", uncuratedConfig);
    (uncuratedConfig.type !== "CURATED_SPELL")
        ? pass("Non-curated spell falls through to heuristic routing")
        : fail("Non-curated spell incorrectly flagged as CURATED_SPELL");

    // 5b. If we have any curated slugs, test that one of them IS flagged as curated
    if (curatedSet.size > 0) {
        const sampleSlug = Array.from(curatedSet)[0];
        const mockCurated = {
            name: sampleSlug,
            slug: sampleSlug,
            system: { description: { value: "" }, traits: { value: [] } }
        };
        const curatedConfig = parseSpellToAnimation(mockCurated);
        log(`parseSpellToAnimation({slug: "${sampleSlug}"})`, curatedConfig);
        (curatedConfig.type === "CURATED_SPELL")
            ? pass(`Curated slug "${sampleSlug}" correctly flagged as CURATED_SPELL`)
            : fail(`Curated slug "${sampleSlug}" was NOT flagged as curated`, curatedConfig);
    } else {
        console.log("%c  (Skipping curated-match test: no curated slugs available in this world)", "color:#888888;");
    }

    // 5c. With skipCuratedSpells disabled, even a curated slug should fall through
    if (curatedSet.size > 0) {
        const sampleSlug = Array.from(curatedSet)[0];
        const original = game.settings.get("pf2e-heuristic-fallback", "skipCuratedSpells");
        try {
            await game.settings.set("pf2e-heuristic-fallback", "skipCuratedSpells", false);
            const mockCurated = { name: sampleSlug, slug: sampleSlug, system: { description: { value: "" }, traits: { value: [] } } };
            const cfg = parseSpellToAnimation(mockCurated);
            (cfg.type !== "CURATED_SPELL")
                ? pass("With skipCuratedSpells=false, curated slug falls through to heuristic routing")
                : fail("With skipCuratedSpells=false, curated slug was still flagged CURATED_SPELL");
        } finally {
            await game.settings.set("pf2e-heuristic-fallback", "skipCuratedSpells", original);
        }
    }

    // --------------------------------------------------------
    // 6. End-to-end: executeHeuristicAnimation on a controlled token
    // --------------------------------------------------------
    console.log("%c--- 6. End-to-end animation (requires a controlled token) ---", "color:#9900ff;font-weight:bold;");
    const token = canvas.tokens?.controlled[0];
    if (!token) {
        console.log("%c  (No controlled token - select a token on the canvas and re-run this section to see a live animation)", "color:#888888;");
    } else {
        const liveSpell = {
            name: "Console Test Fire Bolt",
            slug: "console-test-fire-bolt",
            system: { description: { value: "A bolt of fire shoots from your hand at a target." }, traits: { value: ["fire", "evocation", "arcane"] } }
        };
        log("Playing test animation on controlled token", token.name);
        await executeHeuristicAnimation(liveSpell, token);
        pass("executeHeuristicAnimation completed without throwing (check canvas for effect)");
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
