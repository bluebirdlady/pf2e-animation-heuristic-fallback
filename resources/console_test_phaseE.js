/**
 * Console test script for Phase E (Configuration Caching).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.6.0 active) and paste this
 * whole script in, then press Enter.
 *
 * This script temporarily toggles the "enableConfigCache" setting and
 * overrides console.debug (to capture the cache-cleared message),
 * restoring both when finished (even if a check throws).
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase E Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["parseSpellToAnimation", "executeHeuristicAnimation"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.6.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "enableConfigCache");
    const originalDebug = console.debug;

    try {
        // ----------------------------------------------------
        // 1. enableConfigCache setting
        // ----------------------------------------------------
        console.log("%c--- 1. enableConfigCache setting ---", "color:#9900ff;font-weight:bold;");
        log("Current enableConfigCache value", originalSetting);

        if (typeof originalSetting === "boolean") {
            pass(`enableConfigCache is a boolean (${originalSetting})`);
        } else {
            fail("enableConfigCache missing or not a boolean", originalSetting);
        }

        // ----------------------------------------------------
        // 2. enableConfigCache = true: repeated parses return the same object
        // ----------------------------------------------------
        console.log("%c--- 2. enableConfigCache = true (cached) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", true);

        const mockSpellA = {
            name: "Console Test Cache Spell A",
            slug: "console-test-cache-spell-a",
            system: { description: { value: "A bolt of fire shoots from your hand at a target, leaving a burning impact." }, traits: { value: ["fire"] } }
        };

        const configA1 = parseSpellToAnimation(mockSpellA);
        const configA2 = parseSpellToAnimation(mockSpellA);
        log("First parse result", configA1);
        log("Second parse result", configA2);

        if (configA1 === configA2) {
            pass("Second parseSpellToAnimation() call returned the cached object (same reference)");
        } else {
            fail("Second call did not return the cached object", { configA1, configA2 });
        }

        // ----------------------------------------------------
        // 3. enableConfigCache = false: repeated parses return distinct objects
        // ----------------------------------------------------
        console.log("%c--- 3. enableConfigCache = false (no caching) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", false);

        const mockSpellB = {
            name: "Console Test Cache Spell B",
            slug: "console-test-cache-spell-b",
            system: { description: { value: "A bolt of fire shoots from your hand at a target, leaving a burning impact." }, traits: { value: ["fire"] } }
        };

        const configB1 = parseSpellToAnimation(mockSpellB);
        const configB2 = parseSpellToAnimation(mockSpellB);
        log("First parse result", configB1);
        log("Second parse result", configB2);

        if (configB1 !== configB2) {
            pass("With caching disabled, each call returns a freshly parsed object");
        } else {
            fail("With caching disabled, calls unexpectedly returned the same object", { configB1, configB2 });
        }

        const sameShape = JSON.stringify(configB1) === JSON.stringify(configB2);
        if (sameShape) {
            pass("Freshly parsed objects are equivalent in content");
        } else {
            fail("Freshly parsed objects differ in content", { configB1, configB2 });
        }

        // ----------------------------------------------------
        // 4. Cache size limit auto-clear (re-enable caching)
        // ----------------------------------------------------
        console.log("%c--- 4. Cache size limit auto-clear ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", true);

        let sawClearMessage = false;
        console.debug = function () {
            const text = Array.from(arguments).join(" ");
            if (text.indexOf("Config cache cleared") !== -1) sawClearMessage = true;
            originalDebug.apply(console, arguments);
        };

        for (let i = 0; i < 501; i++) {
            const spell = {
                name: `Console Test Cache Filler ${i}`,
                slug: `console-test-cache-filler-${i}`,
                system: { description: { value: "A bolt of fire shoots from your hand." }, traits: { value: ["fire"] } }
            };
            parseSpellToAnimation(spell);
        }

        console.debug = originalDebug;

        if (sawClearMessage) {
            pass("Config cache auto-cleared after exceeding the 500-entry limit");
        } else {
            fail("Did not see the 'Config cache cleared' debug message after 501 unique spells");
        }

        // ----------------------------------------------------
        // 5. End-to-end: executeHeuristicAnimation still works with caching on
        // ----------------------------------------------------
        console.log("%c--- 5. End-to-end animation (requires a controlled token) ---", "color:#9900ff;font-weight:bold;");
        const token = canvas.tokens?.controlled[0];
        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas and re-run this section to see a live animation)", "color:#888888;");
        } else {
            await executeHeuristicAnimation(mockSpellA, token);
            pass("executeHeuristicAnimation completed without throwing using a cached config");
        }

    } finally {
        console.debug = originalDebug;
        await game.settings.set("pf2e-heuristic-fallback", "enableConfigCache", originalSetting);
        log("Restored enableConfigCache setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
