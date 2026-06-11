"""
Phase K2: Extracts predicate-tagged animation candidates from the PF2e
Graphics module's older animation data set (animations_old/spells/**).

Unlike extract_pf2e_graphics.py (Phase J), this walks each trigger-group's
full predicate tree and emits one flat candidate per leaf "file" entry,
carrying the full accumulated predicate (top-level group predicate + every
ancestor "predicate" array on the path to that leaf) and the trigger that
applies to it. This lets the runtime resolver (resolveAnimationTreeAsset)
make predicate-aware choices (e.g. item traits, melee/ranged, action cost)
instead of relying purely on first-valid-wins asset probing.

Output: resources/pf2e_animation_trees.json
  { "<slug>": [ { "trigger": str, "role": str, "predicate": [...], "file": str }, ... ] }
"""
import json
import re
import glob

PRESET_TO_ROLE = {"ranged": "projectile", "melee": "impact", "onToken": "impact", "template": "areaEffect"}
SLUG_RE = re.compile(r'^(?:origin:)?item:slug:([a-z0-9-]+)$', re.I)


def walk(node, trigger, preset, predicates, out):
    trigger = node.get("trigger", trigger)
    preset = node.get("preset", preset)
    preds = predicates + (node.get("predicate") or [])

    if "file" in node:
        role = PRESET_TO_ROLE.get(preset)
        if role:
            out.append({"trigger": trigger, "role": role, "predicate": preds, "file": node["file"]})

    for child in node.get("contents", []) or []:
        walk(child, trigger, preset, preds, out)


def main():
    result = {}
    aliases = {}  # slug -> alias target slug (e.g. "item:slug:heal-animal" -> "item:slug:heal")

    for path in glob.glob("pf2e-graphics-1-alpha/animations_old/spells/**/*.json", recursive=True):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        for key, groups in data.items():
            m = SLUG_RE.match(key)
            if not m:
                continue
            slug = m.group(1)
            if not slug:
                continue

            # Some entries are aliases: a string value naming another key
            # whose animation set should be reused (e.g. "item:slug:heal-animal":
            # "item:slug:heal"). Resolve these in a second pass.
            if isinstance(groups, str):
                target = SLUG_RE.match(groups)
                if target:
                    aliases[slug] = target.group(1)
                continue

            candidates = result.setdefault(slug, [])
            for group in groups:
                if not isinstance(group, dict):
                    continue
                walk(group, group.get("trigger"), group.get("preset"), [], candidates)

    # Resolve aliases against the now-fully-populated result map
    for slug, target_slug in aliases.items():
        if slug in result:
            continue
        if target_slug in result:
            result[slug] = result[target_slug]

    # Dedupe identical (trigger, role, file, predicate) entries
    for slug, cands in result.items():
        seen = set()
        deduped = []
        for c in cands:
            key = (c["trigger"], c["role"], c["file"], json.dumps(c["predicate"], sort_keys=True))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(c)
        result[slug] = deduped

    with open("pf2e_animation_trees.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote {len(result)} spell entries to pf2e_animation_trees.json")


if __name__ == "__main__":
    main()
