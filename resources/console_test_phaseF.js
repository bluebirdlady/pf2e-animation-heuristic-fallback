/**
 * Console test script for Phase F (Template Placement Handling).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.7.0 active) and paste this
 * whole script in, then press Enter.
 *
 * Section 5 is interactive: when prompted, place a measured template
 * (e.g. drag out a burst/circle template) within 5 seconds to exercise the
 * "template found" path, or let it time out to exercise the fallback path.
 *
 * Temporarily toggles "useTemplateHandling" and overrides console.debug
 * to capture log messages, restoring both when finished (even if a check
 * throws).
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase F Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["listenForTemplatePlacement", "executeHeuristicAnimation", "parseSpellToAnimation"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.7.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "useTemplateHandling");
    const originalDebug = console.debug;

    try {
        // ----------------------------------------------------
        // 1. useTemplateHandling setting
        // ----------------------------------------------------
        console.log("%c--- 1. useTemplateHandling setting ---", "color:#9900ff;font-weight:bold;");
        log("Current useTemplateHandling value", originalSetting);

        if (typeof originalSetting === "boolean") {
            pass(`useTemplateHandling is a boolean (${originalSetting})`);
        } else {
            fail("useTemplateHandling missing or not a boolean", originalSetting);
        }

        // ----------------------------------------------------
        // 2. listenForTemplatePlacement() timeout path
        // ----------------------------------------------------
        console.log("%c--- 2. listenForTemplatePlacement timeout ---", "color:#9900ff;font-weight:bold;");

        let debugLines = [];
        console.debug = function () {
            debugLines.push(Array.from(arguments).join(" "));
            originalDebug.apply(console, arguments);
        };

        const timeoutResult = await listenForTemplatePlacement(200);
        if (timeoutResult === null) {
            pass("listenForTemplatePlacement() resolves to null on timeout");
        } else {
            fail("listenForTemplatePlacement() did not resolve to null on timeout", timeoutResult);
        }

        const sawTimeoutLog = debugLines.some(function (m) { return m.indexOf("Template placement timeout") !== -1; });
        if (sawTimeoutLog) {
            pass("Timeout path logged 'Template placement timeout'");
        } else {
            fail("Expected timeout debug message not found", debugLines);
        }

        // ----------------------------------------------------
        // 3. listenForTemplatePlacement() resolves on createMeasuredTemplate
        // ----------------------------------------------------
        console.log("%c--- 3. listenForTemplatePlacement resolves on hook ---", "color:#9900ff;font-weight:bold;");

        debugLines = [];
        const mockTemplateObject = { position: { x: 1234, y: 5678 } };
        const mockTemplateDoc = { object: mockTemplateObject };

        const placementPromise = listenForTemplatePlacement(2000);
        setTimeout(function () {
            Hooks.call("createMeasuredTemplate", mockTemplateDoc);
        }, 100);
        const placementResult = await placementPromise;

        if (placementResult === mockTemplateObject) {
            pass("listenForTemplatePlacement() resolves with the template object from the hook");
        } else {
            fail("listenForTemplatePlacement() did not resolve with the expected template object", placementResult);
        }

        const sawDetectedLog = debugLines.some(function (m) { return m.indexOf("Template placement detected") !== -1; });
        if (sawDetectedLog) {
            pass("Detection path logged 'Template placement detected'");
        } else {
            fail("Expected detection debug message not found", debugLines);
        }

        console.debug = originalDebug;

        // ----------------------------------------------------
        // 4. useTemplateHandling = false: no template wait for burst spells
        // ----------------------------------------------------
        console.log("%c--- 4. useTemplateHandling = false (no-op) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "useTemplateHandling", false);

        const token = canvas.tokens?.controlled[0];
        const mockBurstSpell = {
            name: "Console Test Burst Spell",
            slug: "console-test-burst-spell",
            system: {
                description: { value: "A burst of fire damages all creatures in the area." },
                traits: { value: ["fire"] },
                area: { type: "burst", value: 10 }
            }
        };

        const burstConfig = parseSpellToAnimation(mockBurstSpell);
        log("parseSpellToAnimation(mockBurstSpell)", burstConfig);
        if (burstConfig.type === "burst") {
            pass("Mock spell classified as type 'burst'");
        } else {
            fail("Mock spell was not classified as 'burst'", burstConfig);
        }

        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas to exercise sections 4-5 live)", "color:#888888;");
        } else {
            debugLines = [];
            console.debug = function () {
                debugLines.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            await executeHeuristicAnimation(mockBurstSpell, token);

            console.debug = originalDebug;

            const sawAwait = debugLines.some(function (m) { return m.indexOf("Awaiting template placement") !== -1; });
            if (!sawAwait) {
                pass("With useTemplateHandling=false, no template wait occurred (unchanged behavior)");
            } else {
                fail("Unexpected template wait with useTemplateHandling=false", debugLines);
            }
        }

        // ----------------------------------------------------
        // 5. useTemplateHandling = true: live template handling (interactive)
        // ----------------------------------------------------
        console.log("%c--- 5. useTemplateHandling = true (interactive) ---", "color:#9900ff;font-weight:bold;");
        await game.settings.set("pf2e-heuristic-fallback", "useTemplateHandling", true);

        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas and re-run this section to test live template handling)", "color:#888888;");
        } else {
            console.log("%c  Place a measurement template (e.g. drag out a burst circle) within 5 seconds, or wait for the timeout fallback...", "color:#ffaa00;font-weight:bold;");

            debugLines = [];
            console.debug = function () {
                debugLines.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            await executeHeuristicAnimation(mockBurstSpell, token);

            console.debug = originalDebug;

            const sawAwait = debugLines.some(function (m) { return m.indexOf("Awaiting template placement") !== -1; });
            const sawDetected = debugLines.some(function (m) { return m.indexOf("Template placement detected") !== -1; });
            const sawTimeout = debugLines.some(function (m) { return m.indexOf("Template placement timeout") !== -1; });

            if (sawAwait) {
                pass("With useTemplateHandling=true, the engine awaited a template for the burst spell");
            } else {
                fail("Expected 'Awaiting template placement' debug message not found", debugLines);
            }

            if (sawDetected) {
                pass("Template placement was detected and used to center the burst (check canvas for ring at template location)");
            } else if (sawTimeout) {
                pass("No template placed in time - fallback positioning was used (check canvas for ring at target/self)");
            } else {
                fail("Neither 'Template placement detected' nor 'Template placement timeout' was logged", debugLines);
            }

            pass("executeHeuristicAnimation completed without throwing");
        }

    } finally {
        console.debug = originalDebug;
        await game.settings.set("pf2e-heuristic-fallback", "useTemplateHandling", originalSetting);
        log("Restored useTemplateHandling setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
