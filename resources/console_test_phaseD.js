/**
 * Console test script for Phase D (Concurrency Protection).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.5.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This script temporarily overrides console.debug (to capture the
 * "Max concurrent animations" skip message) and toggles the
 * "maxConcurrentAnimations" setting, restoring both when finished
 * (even if a check throws). Requires a controlled token to exercise
 * the live executeHeuristicAnimation() paths.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase D Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["parseSpellToAnimation", "executeHeuristicAnimation", "getSettingSafe"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.5.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "maxConcurrentAnimations");
    const originalDebug = console.debug;

    try {
        // ----------------------------------------------------
        // 1. Setting registration / defaults
        // ----------------------------------------------------
        console.log("%c--- 1. maxConcurrentAnimations setting ---", "color:#9900ff;font-weight:bold;");
        log("Current maxConcurrentAnimations value", originalSetting);

        const isValidRange = (typeof originalSetting === "number") && (originalSetting >= 1) && (originalSetting <= 16);
        if (isValidRange) {
            pass(`maxConcurrentAnimations is a number within [1,16] (${originalSetting})`);
        } else {
            fail("maxConcurrentAnimations missing or out of range", originalSetting);
        }

        const safeDefault = getSettingSafe("maxConcurrentAnimations");
        log("getSettingSafe('maxConcurrentAnimations')", safeDefault);

        if (typeof safeDefault === "number") {
            pass("getSettingSafe('maxConcurrentAnimations') returns a number");
        } else {
            fail("getSettingSafe('maxConcurrentAnimations') did not return a number", safeDefault);
        }

        // ----------------------------------------------------
        // 2. End-to-end concurrency throttling (requires a controlled token)
        // ----------------------------------------------------
        console.log("%c--- 2. End-to-end concurrency throttling ---", "color:#9900ff;font-weight:bold;");
        const token = canvas.tokens?.controlled[0];
        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas and re-run this section to exercise live throttling)", "color:#888888;");
        } else {
            const mockSpell = {
                name: "Console Test Concurrency Spell",
                slug: "console-test-concurrency-spell",
                system: { description: { value: "A bolt of fire shoots from your hand at a target, leaving a burning impact." }, traits: { value: ["fire"] } }
            };

            // Capture console.debug skip messages
            let skipMessages = [];
            console.debug = function () {
                skipMessages.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            // 2a. With max=1, firing two overlapping casts should skip the second
            await game.settings.set("pf2e-heuristic-fallback", "maxConcurrentAnimations", 1);
            skipMessages = [];

            const p1 = executeHeuristicAnimation(mockSpell, token);
            const p2 = executeHeuristicAnimation(mockSpell, token);
            await Promise.all([p1, p2]);

            const sawSkip = skipMessages.some(function (m) { return m.indexOf("Max concurrent animations") !== -1; });
            if (sawSkip) {
                pass("With maxConcurrentAnimations=1, an overlapping second cast was skipped");
            } else {
                fail("Expected a 'Max concurrent animations' skip message but none was logged", skipMessages);
            }

            // 2b. With max=16, firing two overlapping casts should NOT skip either
            await game.settings.set("pf2e-heuristic-fallback", "maxConcurrentAnimations", 16);
            skipMessages = [];

            const p3 = executeHeuristicAnimation(mockSpell, token);
            const p4 = executeHeuristicAnimation(mockSpell, token);
            await Promise.all([p3, p4]);

            const sawSkip2 = skipMessages.some(function (m) { return m.indexOf("Max concurrent animations") !== -1; });
            if (!sawSkip2) {
                pass("With maxConcurrentAnimations=16, overlapping casts were not skipped");
            } else {
                fail("Unexpected skip message with high concurrency limit", skipMessages);
            }

            console.debug = originalDebug;
            pass("executeHeuristicAnimation completed without throwing across all concurrency calls");
        }

    } finally {
        console.debug = originalDebug;
        await game.settings.set("pf2e-heuristic-fallback", "maxConcurrentAnimations", originalSetting);
        log("Restored maxConcurrentAnimations setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
