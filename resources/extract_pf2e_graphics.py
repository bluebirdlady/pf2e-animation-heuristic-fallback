"""
Offline extraction script (Phase J): mines the PF2e Graphics module's
older, more complete animation data set (animations_old/spells/**) for
per-spell JB2A asset paths, grouped by role, and writes a compact JSON
map keyed by spell slug.

Usage (run once, not part of the live Foundry module):
    python resources/extract_pf2e_graphics.py

Output: resources/pf2e_graphics_asset_map.json
  {
    "<slug>": {
      "projectile": ["jb2a....", ...],   // from preset "ranged"
      "impact":     ["jb2a....", ...],   // from preset "onToken" / "melee"
      "areaEffect": ["jb2a....", ...]    // from preset "template"
    },
    ...
  }

Notes:
- Sound files (graphics-sfx.*) and non-jb2a graphics are ignored.
- "preset" is inherited down through nested "contents" arrays unless a
  nested node specifies its own preset.
- Candidate order is preserved as encountered (predicate-gated alternates,
  e.g. "jb2a:free" vs "jb2a:patreon", are both kept as candidates - the
  live module validates each with isValidSequencerPath() and uses the
  first that resolves).
- Roles with no entries are omitted entirely; slugs with no jb2a files at
  all are omitted from the output.
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SPELLS_DIR = os.path.join(SCRIPT_DIR, "pf2e-graphics-1-alpha", "animations_old", "spells")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "pf2e_graphics_asset_map.json")

PRESET_TO_ROLE = {
    "ranged": "projectile",
    "melee": "impact",
    "onToken": "impact",
    "template": "areaEffect"
}

SLUG_RE = re.compile(r"item:slug:([a-z0-9-]+)", re.IGNORECASE)


def walk_contents(node, inherited_preset, slug_entry):
    if not isinstance(node, dict):
        return

    preset = node.get("preset", inherited_preset)

    file_val = node.get("file")
    if isinstance(file_val, str) and file_val.lower().startswith("jb2a."):
        role = PRESET_TO_ROLE.get(preset)
        if role:
            bucket = slug_entry.setdefault(role, [])
            if file_val not in bucket:
                bucket.append(file_val)

    contents = node.get("contents")
    if isinstance(contents, list):
        for child in contents:
            walk_contents(child, preset, slug_entry)


def extract_slug(key):
    match = SLUG_RE.search(key)
    return match.group(1) if match else None


def main():
    files = []
    for root, _dirs, names in os.walk(SPELLS_DIR):
        for name in names:
            if name.endswith(".json"):
                files.append(os.path.join(root, name))

    result = {}

    for file_path in files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Skipping {file_path}: {e}")
            continue

        for key, groups in data.items():
            slug = extract_slug(key)
            if not slug or not isinstance(groups, list):
                continue

            slug_entry = result.setdefault(slug, {})

            for group in groups:
                if isinstance(group, dict):
                    walk_contents(group, group.get("preset"), slug_entry)

    # Drop slugs that ended up with no usable roles
    result = {slug: roles for slug, roles in result.items() if roles}

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
        f.write("\n")

    print(f"Wrote {len(result)} spell entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
