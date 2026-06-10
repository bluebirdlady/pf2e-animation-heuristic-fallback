/**
 * Console test script for Phase G (Persistent Crowd-Control Effects, beta).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.8.0 active) and paste this
 * whole script in, then press Enter.
 *
 * Requires a controlled token. This script simulates condition
 * create/delete by directly calling Hooks.call("createItem"/"deleteItem")
 * with a mock condition item - it does NOT modify your actor's actual
 * conditions.
 *
 * Temporarily toggles "enableCCEffects" and overrides console.debug to
 * capture log messages, restoring both when finished (even if a check
 * throws). Cleans up any effects it creates.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase G Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["applyCCEffect", "clearCCEffect", "clearAllCCEffectsForToken", "ccEffectName"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.8.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    const SequencerAPI = typeof Sequencer !== 'undefined' ? Sequencer : game.modules.get("sequencer")?.api;
    if (!SequencerAPI?.EffectManager) {
        fail("Sequencer.EffectManager not available", "Is Sequencer active?");
    } else {
        pass("Sequencer.EffectManager is available");
    }

    const originalSetting = game.settings.get("pf2e-heuristic-fallback", "enableCCEffects");
    const originalDebug = console.debug;
    const token = canvas.tokens?.controlled[0];

    try {
        // ----------------------------------------------------
        // 1. enableCCEffects setting
        // ----------------------------------------------------
        console.log("%c--- 1. enableCCEffects setting ---", "color:#9900ff;font-weight:bold;");
        log("Current enableCCEffects value", originalSetting);

        if (typeof originalSetting === "boolean") {
            pass(`enableCCEffects is a boolean (${originalSetting})`);
        } else {
            fail("enableCCEffects missing or not a boolean", originalSetting);
        }

        if (!token) {
            console.log("%c  (No controlled token - select a token on the canvas to run sections 2-4)", "color:#888888;");
        } else {
            const effectName = ccEffectName(token.document.id, "restrained");
            const mockItem = {
                type: "condition",
                slug: "restrained",
                parent: { getActiveTokens: () => [token] }
            };

            // ----------------------------------------------------
            // 2. enableCCEffects = false: createItem hook is a no-op
            // ----------------------------------------------------
            console.log("%c--- 2. enableCCEffects = false (no-op) ---", "color:#9900ff;font-weight:bold;");
            await game.settings.set("pf2e-heuristic-fallback", "enableCCEffects", false);

            let debugLines = [];
            console.debug = function () {
                debugLines.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            Hooks.call("createItem", mockItem);
            await new Promise(r => setTimeout(r, 100));

            console.debug = originalDebug;

            const sawApplyDisabled = debugLines.some(m => m.indexOf("Applying persistent CC effect") !== -1);
            if (!sawApplyDisabled) {
                pass("With enableCCEffects=false, createItem hook did not apply an effect");
            } else {
                fail("Effect was applied despite enableCCEffects=false", debugLines);
            }

            const effectsDisabled = SequencerAPI.EffectManager.getEffects({ name: effectName });
            if (!effectsDisabled || effectsDisabled.length === 0) {
                pass("No persistent effect exists after disabled createItem hook");
            } else {
                fail("Unexpected persistent effect found while disabled", effectsDisabled);
                SequencerAPI.EffectManager.endEffects({ name: effectName });
            }

            // ----------------------------------------------------
            // 3. enableCCEffects = true: createItem applies the overlay
            // ----------------------------------------------------
            console.log("%c--- 3. enableCCEffects = true: apply overlay ---", "color:#9900ff;font-weight:bold;");
            await game.settings.set("pf2e-heuristic-fallback", "enableCCEffects", true);

            debugLines = [];
            console.debug = function () {
                debugLines.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            Hooks.call("createItem", mockItem);
            await new Promise(r => setTimeout(r, 300));

            console.debug = originalDebug;

            const sawApplyEnabled = debugLines.some(m => m.indexOf("Applying persistent CC effect") !== -1);
            if (sawApplyEnabled) {
                pass('createItem hook logged "Applying persistent CC effect"');
            } else {
                fail('Expected "Applying persistent CC effect" debug message not found', debugLines);
            }

            const effectsEnabled = SequencerAPI.EffectManager.getEffects({ name: effectName });
            if (effectsEnabled && effectsEnabled.length > 0) {
                pass(`Persistent effect "${effectName}" is active on the token (check canvas for overlay)`);
            } else {
                fail(`Persistent effect "${effectName}" not found via Sequencer.EffectManager`, effectsEnabled);
            }

            // ----------------------------------------------------
            // 4. enableCCEffects = true: deleteItem clears the overlay
            // ----------------------------------------------------
            console.log("%c--- 4. deleteItem clears overlay ---", "color:#9900ff;font-weight:bold;");

            debugLines = [];
            console.debug = function () {
                debugLines.push(Array.from(arguments).join(" "));
                originalDebug.apply(console, arguments);
            };

            Hooks.call("deleteItem", mockItem);
            await new Promise(r => setTimeout(r, 300));

            console.debug = originalDebug;

            const sawClear = debugLines.some(m => m.indexOf("Clearing persistent CC effect") !== -1);
            if (sawClear) {
                pass('deleteItem hook logged "Clearing persistent CC effect"');
            } else {
                fail('Expected "Clearing persistent CC effect" debug message not found', debugLines);
            }

            const effectsAfterClear = SequencerAPI.EffectManager.getEffects({ name: effectName });
            if (!effectsAfterClear || effectsAfterClear.length === 0) {
                pass(`Persistent effect "${effectName}" was removed`);
            } else {
                fail(`Persistent effect "${effectName}" still present after deleteItem`, effectsAfterClear);
                SequencerAPI.EffectManager.endEffects({ name: effectName });
            }

            // ----------------------------------------------------
            // 5. clearAllCCEffectsForToken fail-safe cleanup
            // ----------------------------------------------------
            console.log("%c--- 5. clearAllCCEffectsForToken fail-safe ---", "color:#9900ff;font-weight:bold;");

            // Re-apply, then sweep-clear via the fail-safe function
            Hooks.call("createItem", mockItem);
            await new Promise(r => setTimeout(r, 300));

            clearAllCCEffectsForToken(token.document.id);
            await new Promise(r => setTimeout(r, 300));

            const effectsAfterSweep = SequencerAPI.EffectManager.getEffects({ name: effectName });
            if (!effectsAfterSweep || effectsAfterSweep.length === 0) {
                pass("clearAllCCEffectsForToken removed the lingering effect without throwing");
            } else {
                fail("Effect still present after clearAllCCEffectsForToken", effectsAfterSweep);
                SequencerAPI.EffectManager.endEffects({ name: effectName });
            }
        }

    } finally {
        console.debug = originalDebug;
        await game.settings.set("pf2e-heuristic-fallback", "enableCCEffects", originalSetting);
        log("Restored enableCCEffects setting to", originalSetting);
    }

    console.log("%c=== Test suite complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
