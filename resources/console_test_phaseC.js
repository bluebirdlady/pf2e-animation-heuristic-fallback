/**
 * Console test script for Phase C (Random Animation Variants).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.4.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This script temporarily toggles the "randomVariants" setting to exercise
 * both code paths, then restores the original value when finished (even if
 * a check throws).
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase C Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["resolveAssetVariants", "resolveAssetWithFallback", "isValidSequencerPath", "parseSpellToAnimation", "executeHeuristicAnimation"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.4.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "randomVariants");

    try {
        // ----------------------------------------------------
        // 1. resolveAssetVariants() basics
        // ----------------------------------------------------
        console.log("%c--- 1. resolveAssetVariants basics ---", "color:#9900ff;font-weight:bold;");

        for (const [assetType, color] of [["impact", "orange"], ["projectile", "orange"], ["castRing", "blue"]]) {
            const variants = resolveAssetVariants(assetType, color);
            log(`resolveAssetVariants("${assetType}", "${color}")`, variants);

            Array.isArray(variants)
                ? pass(`"${assetType}"/"${color}" returns an array (length ${variants.length})`)
                : fail(`"${assetType}"/"${color}" did not return an array`, variants);

            const allValid = variants.every(p => isValidSequencerPath(p));
            (variants.length === 0 || allValid)
                ? pass(`"${assetType}"/"${color}" variant entries are all valid Sequencer paths`)
                : fail(`"${assetType}"/"${color}" contains an invalid path`, variants);

            const allUnique = new Set(variants).size === variants.length;
            allUnique ? pass(`"${assetType}"/"${color}" variants are deduplicated`) : fail(`"${assetType}"/"${color}" has duplicate entries`, variants);
        }

        // Caching: second call returns the same array instance
        const variantsA = resolveAssetVariants("impact", "orange");
        const variantsB = resolveAssetVariants("impact", "orange");
        (variantsA === variantsB) ? pass("resolveAssetVariants() result is cached (same array instance)") : fail("resolveAssetVariants() did not return cached instance");

        // Unknown asset type degrades to empty array, never throws
        const unknownVariants = resolveAssetVariants("notARealAssetType", "blue");
        (Array.isArray(unknownVariants) && unknownVariants.length === 0)
            ? pass("Unknown asset type returns empty array")
            : fail("Unknown asset type did not return empty array", unknownVariants);

        // ----------------------------------------------------
        // 2. randomVariants = false: no *Variants fields on config
        // ----------------------------------------------------
        console.log("%c--- 2. randomVariants = false (no-op) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "randomVariants", false);

        const mockSpell = {
            name: "Console Test Variant Spell",
            slug: "console-test-variant-spell",
            system: { description: { value: "A bolt of fire shoots from your hand at a target, leaving a burning impact." }, traits: { value: ["fire"] } }
        };

        const disabledConfig = parseSpellToAnimation(mockSpell);
        log("parseSpellToAnimation() with randomVariants disabled", disabledConfig);
        const variantKeys = ["castRingVariants", "groundRingVariants", "impactVariants", "projectileVariants", "tokenBuffVariants"];
        const hasNoVariantFields = variantKeys.every(k => disabledConfig[k] === undefined);
        hasNoVariantFields
            ? pass("No *Variants fields present when randomVariants is disabled")
            : fail("Unexpected *Variants field(s) present while disabled", variantKeys.filter(k => disabledConfig[k] !== undefined));

        // ----------------------------------------------------
        // 3. randomVariants = true: *Variants fields appear when 2+ options exist
        // ----------------------------------------------------
        console.log("%c--- 3. randomVariants = true ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "randomVariants", true);

        const enabledConfig = parseSpellToAnimation(mockSpell);
        log("parseSpellToAnimation() with randomVariants enabled", enabledConfig);

        let anyVariantField = false;
        for (const assetType of ["castRing", "groundRing", "impact", "projectile", "tokenBuff"]) {
            const variantsField = enabledConfig[`${assetType}Variants`];
            const directVariants = resolveAssetVariants(assetType, enabledConfig.color);

            if (directVariants.length > 1) {
                anyVariantField = true;
                Array.isArray(variantsField) && variantsField.length === directVariants.length
                    ? pass(`"${assetType}Variants" present with ${variantsField.length} entries (matches resolveAssetVariants)`)
                    : fail(`"${assetType}Variants" missing or mismatched`, { expected: directVariants, actual: variantsField });

                // The single resolved path should be among the variants (it's the first valid match)
                variantsField?.includes(enabledConfig[assetType])
                    ? pass(`"${assetType}" resolved path is included in "${assetType}Variants"`)
                    : fail(`"${assetType}" resolved path missing from variants pool`, { resolved: enabledConfig[assetType], variants: variantsField });
            } else {
                (variantsField === undefined)
                    ? pass(`"${assetType}Variants" correctly absent (only ${directVariants.length} valid variant${directVariants.length === 1 ? "" : "s"})`)
                    : fail(`"${assetType}Variants" present despite <2 valid variants`, variantsField);
            }
        }
        if (!anyVariantField) {
            console.log("%c  (No asset slot for this mock spell had 2+ valid variants in this world's JB2A install - this is a valid outcome, just less interesting to test)", "color:#888888;");
        }

        // ----------------------------------------------------
        // 4. End-to-end: executeHeuristicAnimation with randomVariants enabled
        // ----------------------------------------------------
        console.log("%c--- 4. End-to-end animation (requires a controlled token) ---", "color:#9900ff;font-weight:bold;");
        const token = canvas.tokens?.controlled[0];
        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas and re-run this section to see a live animation)", "color:#888888;");
        } else {
            await executeHeuristicAnimation(mockSpell, token);
            pass("executeHeuristicAnimation completed without throwing (check canvas for effect, and console for '[N variants]' deploy logs)");
        }

    } finally {
        await game.settings.set("pf2e-heuristic-fallback", "randomVariants", originalSetting);
        log("Restored randomVariants setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
