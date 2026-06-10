/**
 * Console test script for Phase B (Enhanced Keyword Classification).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.3.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This script temporarily toggles the "advancedClassification" setting to
 * exercise both the enabled and disabled code paths, then restores the
 * original value when finished (even if a check throws).
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase B Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredGlobals = ["ENHANCED_KEYWORD_MAP", "ENHANCED_CLASSIFICATION", "applyEnhancedClassification", "parseSpellToAnimation"];
    for (const name of requiredGlobals) {
        if (typeof globalThis[name] === "undefined") {
            fail(`Global "${name}" not found`, "Is the module active and loaded at v7.3.0?");
        } else {
            pass(`Global "${name}" is available`);
        }
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "advancedClassification");

    try {
        // ----------------------------------------------------
        // 1. Disabled path: applyEnhancedClassification is a no-op
        // ----------------------------------------------------
        console.log("%c--- 1. advancedClassification = false (no-op passthrough) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "advancedClassification", false);

        const baseConfig = { color: "orange", type: "burst", blend: true };
        const passthroughInput = JSON.stringify(baseConfig);
        const mockEvocation = {
            name: "Test Fireball",
            slug: "test-fireball",
            system: { description: { value: "A burst of evocation fire damages all creatures, leaving them entangled in webbing." }, traits: { value: ["fire", "evocation", "arcane"] } }
        };
        const passthroughResult = applyEnhancedClassification({ ...baseConfig }, mockEvocation, "test fireball a burst of evocation fire damages all creatures, leaving them entangled in webbing");
        log("applyEnhancedClassification() with setting disabled", passthroughResult);
        (JSON.stringify(passthroughResult) === passthroughInput)
            ? pass("Disabled setting: config returned unchanged")
            : fail("Disabled setting: config was mutated", passthroughResult);

        // ----------------------------------------------------
        // 2. Enabled path: trait-based detection (Part 1.1, unchanged)
        // ----------------------------------------------------
        console.log("%c--- 2. advancedClassification = true: trait-based detection (Part 1.1) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "advancedClassification", true);

        const traitConfig = applyEnhancedClassification({ color: "orange", type: "burst", blend: true }, mockEvocation, "");
        log("Trait-based classification (traits include evocation, arcane)", traitConfig);
        (traitConfig.schoolKey === "evocation" && !!traitConfig.schoolOverlay)
            ? pass(`School detected from traits: "${traitConfig.schoolKey}"`)
            : fail("School not detected from traits", traitConfig);
        (traitConfig.traditionKey === "arcane" && !!traitConfig.traditionCircle)
            ? pass(`Tradition detected from traits: "${traitConfig.traditionKey}"`)
            : fail("Tradition not detected from traits", traitConfig);

        // ----------------------------------------------------
        // 3. Enabled path: keyword-based fallback (Phase B, no matching traits)
        // ----------------------------------------------------
        console.log("%c--- 3. Keyword-based school/tradition fallback (Phase B) ---", "color:#9900ff;font-weight:bold;");
        const mockNoTraits = {
            name: "Mystery Bolt",
            slug: "mystery-bolt",
            system: { description: { value: "This necromancy spell channels divine power into a dark bolt." }, traits: { value: ["negative"] } }
        };
        const searchString = `${mockNoTraits.name} ${mockNoTraits.system.description.value}`.toLowerCase();
        const keywordConfig = applyEnhancedClassification({ color: "dark_purple", type: "projectile", blend: false }, mockNoTraits, searchString);
        log("Keyword-based classification (traits=['negative'], description mentions 'necromancy' and 'divine')", keywordConfig);
        (keywordConfig.schoolKey === "necromancy" && !!keywordConfig.schoolOverlay)
            ? pass(`School detected via keyword: "${keywordConfig.schoolKey}"`)
            : fail("School not detected via keyword fallback", keywordConfig);
        (keywordConfig.traditionKey === "divine" && !!keywordConfig.traditionCircle)
            ? pass(`Tradition detected via keyword: "${keywordConfig.traditionKey}"`)
            : fail("Tradition not detected via keyword fallback", keywordConfig);

        // ----------------------------------------------------
        // 4. Trait-based detection takes priority over keyword fallback
        // ----------------------------------------------------
        console.log("%c--- 4. Trait-based detection takes priority over keywords ---", "color:#9900ff;font-weight:bold;");
        const mockConflict = {
            name: "Conflicted Spell",
            slug: "conflicted-spell",
            // Traits say "abjuration"/"occult", but description text mentions "evocation"/"arcane"
            system: { description: { value: "Though it looks like evocation, this arcane-sounding spell is actually a ward." }, traits: { value: ["abjuration", "occult"] } }
        };
        const conflictSearch = `${mockConflict.name} ${mockConflict.system.description.value}`.toLowerCase();
        const conflictConfig = applyEnhancedClassification({ color: "blue", type: "utility", blend: false }, mockConflict, conflictSearch);
        log("Conflict classification (traits=['abjuration','occult'], description mentions 'evocation'/'arcane')", conflictConfig);
        (conflictConfig.schoolKey === "abjuration")
            ? pass(`Trait-based school ("abjuration") took priority over keyword match ("evocation")`)
            : fail("Keyword incorrectly overrode trait-based school", conflictConfig);
        (conflictConfig.traditionKey === "occult")
            ? pass(`Trait-based tradition ("occult") took priority over keyword match ("arcane")`)
            : fail("Keyword incorrectly overrode trait-based tradition", conflictConfig);

        // ----------------------------------------------------
        // 5. Restraint / CC condition detection
        // ----------------------------------------------------
        console.log("%c--- 5. Restraint / CC condition detection ---", "color:#9900ff;font-weight:bold;");

        // 5a. Nature-flavored restraint
        const mockEntangle = {
            name: "Entangling Vines",
            slug: "entangling-vines",
            system: { description: { value: "Thorny vines erupt from the ground, leaving creatures entangled and restrained." }, traits: { value: ["nature", "primal"] } }
        };
        const entangleSearch = `${mockEntangle.name} ${mockEntangle.system.description.value}`.toLowerCase();
        const entangleConfig = applyEnhancedClassification({ color: "green", type: "burst", blend: false }, mockEntangle, entangleSearch);
        log("Restraint classification (nature trait, 'entangled'/'restrained' in description)", entangleConfig);
        (Array.isArray(entangleConfig.detectedConditions) && entangleConfig.detectedConditions.includes("entangled") && entangleConfig.detectedConditions.includes("restrained"))
            ? pass(`Detected conditions include "entangled" and "restrained": [${entangleConfig.detectedConditions.join(", ")}]`)
            : fail("Expected conditions not detected", entangleConfig.detectedConditions);
        (entangleConfig.restraintKey === "nature" && entangleConfig.restraintOverlay === ENHANCED_CLASSIFICATION.restraints.nature)
            ? pass(`Restraint overlay correctly keyed to "nature"`)
            : fail("Restraint overlay not keyed to 'nature'", { restraintKey: entangleConfig.restraintKey, restraintOverlay: entangleConfig.restraintOverlay });

        // 5b. No conditions present - fields should be absent
        const mockNoConditions = {
            name: "Plain Light",
            slug: "plain-light",
            system: { description: { value: "A simple light shines from your hand." }, traits: { value: ["evocation"] } }
        };
        const noConditionConfig = applyEnhancedClassification({ color: "gold", type: "utility", blend: false }, mockNoConditions, "plain light a simple light shines from your hand");
        log("No-condition spell classification", noConditionConfig);
        (!noConditionConfig.detectedConditions)
            ? pass("No 'detectedConditions' field when no condition keywords present")
            : fail("Unexpected 'detectedConditions' on a spell with none", noConditionConfig.detectedConditions);

        // ----------------------------------------------------
        // 6. Full pipeline via parseSpellToAnimation()
        // ----------------------------------------------------
        console.log("%c--- 6. Full pipeline: parseSpellToAnimation() ---", "color:#9900ff;font-weight:bold;");
        const fullConfig = parseSpellToAnimation(mockEntangle);
        log("parseSpellToAnimation(mockEntangle)", fullConfig);
        (fullConfig.type !== "CURATED_SPELL" && Array.isArray(fullConfig.detectedConditions))
            ? pass("parseSpellToAnimation() surfaces Phase B classification fields end-to-end")
            : fail("parseSpellToAnimation() did not surface classification fields", fullConfig);

    } finally {
        // Always restore the original setting value
        await game.settings.set("pf2e-heuristic-fallback", "advancedClassification", originalSetting);
        log("Restored advancedClassification setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
