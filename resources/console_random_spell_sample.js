/**
 * Console script: pick 5 random 1st-level PF2e spells from the available
 * compendiums and show how parseSpellToAnimation() classifies each one.
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with the PF2e Heuristic Fallback module active), paste this whole script
 * in, and press Enter.
 *
 * Searches all installed compendiums for Item documents of type "spell"
 * with system.level.value === 1, picks 5 at random, and logs the spell's
 * name/traits/area alongside the parsed animation config.
 */

(async () => {
    const log = (label, value) => console.log(`%c${label}:`, "color:#00ccff;font-weight:bold;", value);

    console.log("%c=== Random 1st-Level Spell Sample ===", "color:#ffaa00;font-weight:bold;font-size:13px;");

    if (typeof parseSpellToAnimation !== "function") {
        console.error("PF2e Heuristic | parseSpellToAnimation not found - is the module active?");
        return;
    }

    // ----------------------------------------------------
    // 1. Gather index entries for 1st-level spells across all spell packs
    // ----------------------------------------------------
    const candidates = [];
    for (const pack of game.packs) {
        if (pack.documentName !== "Item") continue;

        let index;
        try {
            index = await pack.getIndex({ fields: ["type", "system.level.value"] });
        } catch (e) {
            continue;
        }

        for (const entry of index) {
            if (entry.type === "spell" && entry.system?.level?.value === 1) {
                candidates.push({ pack, uuid: `Compendium.${pack.collection}.${entry._id}`, name: entry.name });
            }
        }
    }

    log("Total 1st-level spell candidates found", candidates.length);

    if (candidates.length === 0) {
        console.error("PF2e Heuristic | No 1st-level spells found in any compendium.");
        return;
    }

    // ----------------------------------------------------
    // 2. Pick 5 at random (without replacement)
    // ----------------------------------------------------
    const picks = [];
    const pool = [...candidates];
    const sampleSize = Math.min(5, pool.length);
    for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(idx, 1)[0]);
    }

    // ----------------------------------------------------
    // 3. Load each spell and run it through parseSpellToAnimation
    // ----------------------------------------------------
    for (const pick of picks) {
        const spell = await fromUuid(pick.uuid);
        if (!spell) {
            console.warn(`PF2e Heuristic | Could not load ${pick.uuid}`);
            continue;
        }

        const config = parseSpellToAnimation(spell);

        console.log(`%c--- ${spell.name} ---`, "color:#9900ff;font-weight:bold;");
        log("UUID", pick.uuid);
        log("Traits", spell.system?.traits?.value);
        log("Area", spell.system?.area);
        log("Parsed config", config);
    }

    console.log("%c=== Sample complete ===", "color:#ffaa00;font-weight:bold;font-size:13px;");
})();
