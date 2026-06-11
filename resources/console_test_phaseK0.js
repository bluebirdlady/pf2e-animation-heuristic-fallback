/**
 * Console test script for Phase K0 (multi-file script split, no behavior change).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.12.0 active) and paste this
 * whole script in, then press Enter.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase K0 Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // ----------------------------------------------------
    // 1. All expected globals are present after the split
    // ----------------------------------------------------
    console.log("%c--- 1. Global availability ---", "color:#9900ff;font-weight:bold;");

    const requiredFns = [
        "registerSettings", "getSettingSafe", "getSpellSlug",
        "isValidSequencerPath", "resolveVerifiedAssetPath", "resolveAssetWithFallback",
        "resolveAssetVariants", "resolveElementalAreaAsset", "resolvePf2eGraphicsAsset",
        "reportPf2eGraphicsCoverage", "applyEnhancedClassification", "getCuratedSpellSet",
        "parseSpellToAnimation", "cacheParsedConfig", "listenForTemplatePlacement",
        "executeHeuristicAnimation", "applyCCEffect", "clearCCEffect",
        "clearAllCCEffectsForToken", "resolveCCOverlay", "ccEffectName"
    ];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Check scripts/ split and module.json scripts order");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const requiredData = [
        "ASSET_CACHE", "CONFIG_CACHE", "KEYWORD_MAP", "RING_COLOR_ALIASES",
        "EXPLICIT_DATABASE_MAP", "PF2E_GRAPHICS_ASSET_MAP", "ENHANCED_CLASSIFICATION",
        "ENHANCED_KEYWORD_MAP", "ASSET_FALLBACK_CHAIN", "ELEMENTAL_AREA_ASSETS",
        "CURATED_SET_EXCLUDE", "CC_SLUGS", "CC_OVERLAY_CANDIDATES"
    ];
    for (const name of requiredData) {
        if (typeof globalThis[name] === "undefined") {
            fail(`Global "${name}" not found`, "Check scripts/data/asset-maps.js split");
        } else {
            pass(`Global "${name}" is available`);
        }
    }

    // ----------------------------------------------------
    // 2. End-to-end parse of a known spell, comparable to Phase J results
    // ----------------------------------------------------
    console.log("%c--- 2. parseSpellToAnimation() smoke test (acid-splash) ---", "color:#9900ff;font-weight:bold;");

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
    if (acidConfig.color === "green" && acidConfig.elementTrait === "acid" && acidConfig.pf2eGraphicsSlug === "acid-splash") {
        pass("Acid Splash parses with expected color/trait/PF2e Graphics override across split files");
    } else {
        fail("Acid Splash did not parse as expected after the split", acidConfig);
    }

    // ----------------------------------------------------
    // 3. Cross-file dependency check: cc-effects -> asset-resolution + data
    // ----------------------------------------------------
    console.log("%c--- 3. CC overlay resolution (cross-file dependency) ---", "color:#9900ff;font-weight:bold;");

    const overlay = resolveCCOverlay();
    log("resolveCCOverlay()", overlay);
    if (overlay === null || typeof overlay === "string") {
        pass("resolveCCOverlay() returned without throwing (null or a path string)");
    } else {
        fail("resolveCCOverlay() returned an unexpected type", overlay);
    }

    // ----------------------------------------------------
    // 4. Coverage report (informational, exercises asset-resolution + spell-parser)
    // ----------------------------------------------------
    console.log("%c--- 4. Coverage report ---", "color:#9900ff;font-weight:bold;");
    await reportPf2eGraphicsCoverage();
    pass("reportPf2eGraphicsCoverage() completed without throwing");

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
