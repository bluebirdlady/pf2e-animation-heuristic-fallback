"""
Phase K4: Extracts predicate-tagged attack-roll animation candidates for
weapon strikes from the PF2e Graphics module's older animation data set
(animations_old/weapons/**).

Unlike spell entries (keyed by "item:slug:<spell-slug>"), weapon entries are
keyed by "item:slug:<weapon-slug>", "item:base:<base-weapon-type>", or
"item:group:<weapon-group>" - a strike resolver should try these in that
order (most specific first) for the wielded weapon.

Output: resources/pf2e_strike_trees.json
  {
    "bySlug":  { "<weapon-slug>": [ {trigger, role, predicate, file}, ... ] },
    "byBase":  { "<base-type>":   [ ... ] },
    "byGroup": { "<group>":       [ ... ] }
  }
"""
import json
import re
import glob

PRESET_TO_ROLE = {"ranged": "projectile", "melee": "impact", "onToken": "impact", "template": "areaEffect"}
KEY_RE = re.compile(r'^(?:origin:)?item:(slug|base|group):([a-z0-9-]+)$', re.I)

BUCKET_FOR = {"slug": "bySlug", "base": "byBase", "group": "byGroup"}


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
    result = {"bySlug": {}, "byBase": {}, "byGroup": {}}
    aliases = {}  # (bucket, key) -> (target_bucket, target_key)

    for path in glob.glob("pf2e-graphics-1-alpha/animations_old/weapons/**/*.json", recursive=True):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        for key, groups in data.items():
            m = KEY_RE.match(key)
            if not m:
                continue
            kind, name = m.group(1).lower(), m.group(2)
            bucket = BUCKET_FOR[kind]

            if isinstance(groups, str):
                target = KEY_RE.match(groups)
                if target:
                    aliases[(bucket, name)] = (BUCKET_FOR[target.group(1).lower()], target.group(2))
                continue

            candidates = result[bucket].setdefault(name, [])
            for group in groups:
                if not isinstance(group, dict):
                    continue
                walk(group, group.get("trigger"), group.get("preset"), [], candidates)

    for (bucket, name), (target_bucket, target_name) in aliases.items():
        if name in result[bucket]:
            continue
        if target_name in result[target_bucket]:
            result[bucket][name] = result[target_bucket][target_name]

    for bucket in result.values():
        for name, cands in bucket.items():
            seen = set()
            deduped = []
            for c in cands:
                key = (c["trigger"], c["role"], c["file"], json.dumps(c["predicate"], sort_keys=True))
                if key in seen:
                    continue
                seen.add(key)
                deduped.append(c)
            bucket[name] = deduped

    with open("pf2e_strike_trees.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote {len(result['bySlug'])} slug, {len(result['byBase'])} base, {len(result['byGroup'])} group entries to pf2e_strike_trees.json")


if __name__ == "__main__":
    main()
