/**
 * Console script: dump all JB2A entries from the live Sequencer database.
 *
 * Usage: Open the Foundry VTT browser console (F12) in your test world
 * (with Sequencer and a JB2A module active), paste this whole script in,
 * and press Enter. A popup window will open containing the full list of
 * "jb2a.*" database paths formatted as a JSON array, matching the format
 * of resources/jb2a_codes.txt. Select all (Ctrl+A) and copy (Ctrl+C) the
 * contents of the popup to refresh that file.
 *
 * If the popup is blocked by your browser, allow popups for this site and
 * re-run the script.
 */

(() => {
    const SequencerAPI = typeof Sequencer !== 'undefined' ? Sequencer : game.modules.get("sequencer")?.api;
    if (!SequencerAPI?.Database) {
        console.error("PF2e Heuristic | Sequencer.Database not available - is Sequencer active?");
        return;
    }

    let entries = null;

    if (typeof SequencerAPI.Database.flattenedEntries !== "undefined") {
        entries = SequencerAPI.Database.flattenedEntries;
        if (typeof entries === "function") entries = entries.call(SequencerAPI.Database);
    }

    if (!entries && typeof SequencerAPI.Database.entries !== "undefined") {
        const raw = SequencerAPI.Database.entries;
        entries = (typeof raw === "function") ? raw.call(SequencerAPI.Database) : raw;
    }

    if (!entries) {
        console.error("PF2e Heuristic | Could not locate Sequencer.Database entries via known APIs.");
        return;
    }

    // entries may be an array of strings, or a Map/object keyed by path
    let paths = [];
    if (Array.isArray(entries)) {
        paths = entries;
    } else if (entries instanceof Map) {
        paths = Array.from(entries.keys());
    } else if (typeof entries === "object") {
        paths = Object.keys(entries);
    }

    const jb2aPaths = paths
        .filter(p => typeof p === "string" && p.toLowerCase().startsWith("jb2a"))
        .filter((p, i, arr) => arr.indexOf(p) === i)
        .sort((a, b) => a.localeCompare(b));

    if (jb2aPaths.length === 0) {
        console.error("PF2e Heuristic | No 'jb2a.*' entries found. Is a JB2A module active?");
        return;
    }

    console.log(`PF2e Heuristic | Found ${jb2aPaths.length} jb2a.* database entries.`);

    const json = "[\n" + jb2aPaths.map(p => `    "${p}"`).join(",\n") + "\n]\n";

    const popup = window.open("", "_blank", "width=700,height=900,resizable=yes,scrollbars=yes");
    if (!popup) {
        console.error("PF2e Heuristic | Popup blocked - allow popups for this site and re-run.");
        console.log(json);
        return;
    }

    popup.document.title = `JB2A Codes (${jb2aPaths.length} entries)`;
    const pre = popup.document.createElement("textarea");
    pre.value = json;
    pre.style.width = "100%";
    pre.style.height = "100%";
    pre.style.boxSizing = "border-box";
    pre.style.fontFamily = "monospace";
    pre.style.fontSize = "12px";
    pre.style.whiteSpace = "pre";
    popup.document.body.style.margin = "0";
    popup.document.body.appendChild(pre);
    pre.focus();
    pre.select();

    console.log("PF2e Heuristic | Popup opened with JB2A code list. Press Ctrl+A then Ctrl+C to copy, then paste into resources/jb2a_codes.txt.");
})();
