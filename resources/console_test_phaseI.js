/**
 * Console test script for Phase I (Structured Burst Detection + Ring Color
 * Diversity).
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module v7.10.0 active) and paste this
 * whole script in, then press Enter.
 */

(async () => {
    const log = (label, value) => console.log(`%c[TEST] ${label}:`, "color:#00ccff;font-weight:bold;", value);
    const pass = (label) => console.log(`%c[PASS] ${label}`, "color:#00ff66;font-weight:bold;");
    const fail = (label, detail) => console.log(`%c[FAIL] ${label}`, "color:#ff3333;font-weight:bold;", detail ?? "");

    console.log("%c=== PF2e Heuristic Fallback: Phase I Test Suite ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    if (typeof parseSpellToAnimation !== "function") {
        console.error("PF2e Heuristic | parseSpellToAnimation not found - is the module active?");
        return;
    }

    // ----------------------------------------------------
    // 1. Structured area.type "emanation" classifies as "burst" even when
    //    description text doesn't say "burst"/"emanation"/etc.
    // ----------------------------------------------------
    console.log("%c--- 1. Structured emanation -> burst ---", "color:#9900ff;font-weight:bold;");

    const mockEmanationSpell = {
        name: "Console Test Emanation Spell",
        slug: "console-test-emanation-spell",
        system: {
            description: { value: "A foul cloud surrounds you. Creatures nearby take poison damage." },
            traits: { value: ["concentrate", "manipulate", "poison"] },
            area: { type: "emanation", value: 10 }
        }
    };
    const emanationConfig = parseSpellToAnimation(mockEmanationSpell);
    log("parseSpellToAnimation(mockEmanationSpell)", emanationConfig);
    if (emanationConfig.type === "burst") {
        pass('Emanation spell with no "burst"/"emanation" wording classified as type "burst"');
    } else {
        fail('Emanation spell was not classified as type "burst"', emanationConfig);
    }

    // ----------------------------------------------------
    // 2. Structured area.type "cube" also classifies as "burst"
    // ----------------------------------------------------
    console.log("%c--- 2. Structured cube -> burst ---", "color:#9900ff;font-weight:bold;");

    const mockCubeSpell = {
        name: "Console Test Cube Spell",
        slug: "console-test-cube-spell",
        system: {
            description: { value: "A wall of force springs into being." },
            traits: { value: ["force", "evocation"] },
            area: { type: "cube", value: 15 }
        }
    };
    const cubeConfig = parseSpellToAnimation(mockCubeSpell);
    log("parseSpellToAnimation(mockCubeSpell)", cubeConfig);
    if (cubeConfig.type === "burst") {
        pass('Cube-area spell classified as type "burst"');
    } else {
        fail('Cube-area spell was not classified as type "burst"', cubeConfig);
    }

    // ----------------------------------------------------
    // 3. Cone/line classification still takes priority over burst for
    //    elemental area spells (Phase H regression check)
    // ----------------------------------------------------
    console.log("%c--- 3. Cone classification unaffected ---", "color:#9900ff;font-weight:bold;");

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
        pass('Fire cone spell still classified as type "cone" with areaEffect');
    } else {
        fail('Fire cone spell classification regressed', fireConeConfig);
    }

    // ----------------------------------------------------
    // 4. Ring color diversity - non blue/green/red elements should no
    //    longer fall back to a blue cast/ground ring
    // ----------------------------------------------------
    console.log("%c--- 4. Ring color diversity ---", "color:#9900ff;font-weight:bold;");

    const ringElements = [
        { trait: "fire", color: "orange" },
        { trait: "mental", color: "pinkpurple" },
        { trait: "vitality", color: "yellow" },
        { trait: "negative", color: "dark_purple" },
        { trait: "force", color: "purple" }
    ];

    for (const { trait, color } of ringElements) {
        const mockSpell = {
            name: `Console Test ${trait} Ring Spell`,
            slug: `console-test-${trait}-ring-spell`,
            system: { description: { value: "A generic effect." }, traits: { value: [trait] } }
        };
        const config = parseSpellToAnimation(mockSpell);
        log(`parseSpellToAnimation(${trait} spell) castRing/groundRing`, { castRing: config.castRing, groundRing: config.groundRing, color: config.color });
        if (config.castRing && !config.castRing.includes("circle.01.abjuration.blue")) {
            pass(`Trait "${trait}" (color "${color}") resolved a non-fallback-blue cast ring: "${config.castRing}"`);
        } else {
            fail(`Trait "${trait}" (color "${color}") still fell back to circle.01.abjuration.blue`, config.castRing);
        }
    }

    // ----------------------------------------------------
    // 5. Blue/green/red elements unaffected (still resolve, ideally to the
    //    matching color)
    // ----------------------------------------------------
    console.log("%c--- 5. Existing blue/green/red elements still resolve ---", "color:#9900ff;font-weight:bold;");

    const baseElements = [
        { trait: "cold", color: "blue" },
        { trait: "acid", color: "green" },
        { trait: "chaotic", color: "red" }
    ];

    for (const { trait, color } of baseElements) {
        const mockSpell = {
            name: `Console Test ${trait} Ring Spell`,
            slug: `console-test-${trait}-ring-spell`,
            system: { description: { value: "A generic effect." }, traits: { value: [trait] } }
        };
        const config = parseSpellToAnimation(mockSpell);
        log(`parseSpellToAnimation(${trait} spell) castRing/groundRing`, { castRing: config.castRing, groundRing: config.groundRing, color: config.color });
        if (config.castRing) {
            pass(`Trait "${trait}" (color "${color}") cast ring resolved: "${config.castRing}"`);
        } else {
            fail(`Trait "${trait}" (color "${color}") cast ring did not resolve`, config);
        }
    }

    console.log("%c=== Test suite complete === ", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
