/**
 * Console test script for Phase H (Elemental Area Shapes + Expanded Element
 * Coverage).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.9.0 active) and paste this
 * whole script in, then press Enter.
 *
 * Sections 4-5 are end-to-end and require a controlled token (and, for best
 * results, a target). Section 5 is interactive if "useTemplateHandling" is
 * enabled - place a cone/line template within 5 seconds when prompted.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase H Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    // --------------------------------------------------------
    // Sanity check: required globals exist
    // --------------------------------------------------------
    const requiredFns = ["parseSpellToAnimation", "executeHeuristicAnimation", "resolveElementalAreaAsset"];
    for (const fn of requiredFns) {
        if (typeof globalThis[fn] !== "function") {
            fail(`Global function "${fn}" not found`, "Is the module active and loaded at v7.9.0?");
        } else {
            pass(`Global function "${fn}" is available`);
        }
    }

    // ----------------------------------------------------
    // 1. Trait-based element detection (overrides description text)
    // ----------------------------------------------------
    console.log("%c--- 1. Trait-based element detection ---", "color:#9900ff;font-weight:bold;");

    const mockColdSpell = {
        name: "Console Test Cold Spell",
        slug: "console-test-cold-spell",
        system: {
            description: { value: "A blazing fire erupts (description intentionally mismatched)." },
            traits: { value: ["cold", "evocation"] },
            area: null
        }
    };

    const coldConfig = parseSpellToAnimation(mockColdSpell);
    log("parseSpellToAnimation(mockColdSpell)", coldConfig);
    if (coldConfig.elementTrait === "cold" && coldConfig.color === "blue") {
        pass('Spell with traits=["cold", ...] classified as elementTrait "cold" / color "blue" despite fire-themed description');
    } else {
        fail("Trait-based detection did not override description text", coldConfig);
    }

    // ----------------------------------------------------
    // 2. New element table coverage (mental, vitality, etc.)
    // ----------------------------------------------------
    console.log("%c--- 2. New element table coverage ---", "color:#9900ff;font-weight:bold;");

    const newElements = [
        { trait: "mental", expectedColor: "pink" },
        { trait: "vitality", expectedColor: "yellow" },
        { trait: "chaotic", expectedColor: "red" },
        { trait: "lawful", expectedColor: "blue" },
        { trait: "bleed", expectedColor: "red" }
    ];

    for (const { trait, expectedColor } of newElements) {
        const mockSpell = {
            name: `Console Test ${trait} Spell`,
            slug: `console-test-${trait}-spell`,
            system: { description: { value: "A generic effect." }, traits: { value: [trait] } }
        };
        const config = parseSpellToAnimation(mockSpell);
        if (config.elementTrait === trait && config.color === expectedColor) {
            pass(`Trait "${trait}" classified with color "${expectedColor}"`);
        } else {
            fail(`Trait "${trait}" not classified as expected`, config);
        }
    }

    // ----------------------------------------------------
    // 3. resolveElementalAreaAsset()
    // ----------------------------------------------------
    console.log("%c--- 3. resolveElementalAreaAsset() ---", "color:#9900ff;font-weight:bold;");

    const fireCone = resolveElementalAreaAsset("fire", "cone");
    log("resolveElementalAreaAsset('fire', 'cone')", fireCone);
    if (fireCone) {
        pass(`Fire cone asset resolved: "${fireCone}"`);
    } else {
        fail("Fire cone asset did not resolve (check JB2A install for jb2a.breath_weapons.fire.cone.orange.02)");
    }

    const lightningLine = resolveElementalAreaAsset("electricity", "line");
    log("resolveElementalAreaAsset('electricity', 'line')", lightningLine);
    if (lightningLine) {
        pass(`Electricity line asset resolved: "${lightningLine}"`);
    } else {
        fail("Electricity line asset did not resolve (check JB2A install for jb2a.breath_weapons.lightning.line.blue)");
    }

    const mentalCone = resolveElementalAreaAsset("mental", "cone");
    log("resolveElementalAreaAsset('mental', 'cone')", mentalCone);
    if (mentalCone === null) {
        pass("Mental cone correctly resolves to null (no JB2A breath-weapon equivalent)");
    } else {
        fail("Mental cone unexpectedly resolved to a path", mentalCone);
    }

    // ----------------------------------------------------
    // 4. Cone/line spell classification end-to-end
    // ----------------------------------------------------
    console.log("%c--- 4. Cone/line spell classification ---", "color:#9900ff;font-weight:bold;");

    const mockFireCone = {
        name: "Console Test Fire Cone",
        slug: "console-test-fire-cone",
        system: {
            description: { value: "You spew a cone of fire." },
            traits: { value: ["fire", "evocation"] },
            area: { type: "cone", value: 30 }
        }
    };
    const fireConeConfig = parseSpellToAnimation(mockFireCone);
    log("parseSpellToAnimation(mockFireCone)", fireConeConfig);
    if (fireConeConfig.type === "cone" && fireConeConfig.areaEffect) {
        pass(`Fire cone spell classified as type "cone" with areaEffect "${fireConeConfig.areaEffect}"`);
    } else {
        fail('Fire cone spell was not classified as type "cone"', fireConeConfig);
    }

    const mockMentalCone = {
        name: "Console Test Mental Cone",
        slug: "console-test-mental-cone",
        system: {
            description: { value: "You unleash a cone of psychic energy." },
            traits: { value: ["mental", "enchantment"] },
            area: { type: "cone", value: 15 }
        }
    };
    const mentalConeConfig = parseSpellToAnimation(mockMentalCone);
    log("parseSpellToAnimation(mockMentalCone)", mentalConeConfig);
    if (mentalConeConfig.type !== "cone") {
        pass(`Mental cone spell gracefully fell back to type "${mentalConeConfig.type}" (no JB2A asset for mental cones)`);
    } else {
        fail('Mental cone spell unexpectedly classified as type "cone" with no valid asset', mentalConeConfig);
    }

    const mockLightningLine = {
        name: "Console Test Lightning Line",
        slug: "console-test-lightning-line",
        system: {
            description: { value: "A line of lightning blasts outward." },
            traits: { value: ["electricity", "evocation"] },
            area: { type: "line", value: 60 }
        }
    };
    const lightningLineConfig = parseSpellToAnimation(mockLightningLine);
    log("parseSpellToAnimation(mockLightningLine)", lightningLineConfig);
    if (lightningLineConfig.type === "line" && lightningLineConfig.areaEffect) {
        pass(`Lightning line spell classified as type "line" with areaEffect "${lightningLineConfig.areaEffect}"`);
    } else {
        fail('Lightning line spell was not classified as type "line"', lightningLineConfig);
    }

    // ----------------------------------------------------
    // 5. End-to-end animation (requires a controlled token)
    // ----------------------------------------------------
    console.log("%c--- 5. End-to-end cone/line animation ---", "color:#9900ff;font-weight:bold;");
    const token = canvas.tokens?.controlled[0];
    if (!token) {
        console.log("%c  (No controlled token - select a token, optionally target another token, and re-run this section to see live animations)", "color:#888888;");
    } else {
        console.log("%c  Playing fire cone animation...", "color:#ffaa00;");
        await executeHeuristicAnimation(mockFireCone, token);
        pass("Fire cone executeHeuristicAnimation completed without throwing");

        console.log("%c  Playing lightning line animation...", "color:#ffaa00;");
        await executeHeuristicAnimation(mockLightningLine, token);
        pass("Lightning line executeHeuristicAnimation completed without throwing");
    }

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
