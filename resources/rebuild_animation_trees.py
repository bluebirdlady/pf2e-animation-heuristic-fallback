"""
Rebuild animation-trees.js from the K2 base (indented JSON format) plus
all manually authored entries from K3-K5. Handles duplicate slug keys by
merging all entries into a single array per slug.
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_PATH  = r'C:\Users\jws780\Documents\GitHub\pf2e-animation-heuristic-fallback\scripts\data\animation-trees.js'
K2_PATH    = r'C:\Users\jws780\Documents\GitHub\pf2e-animation-heuristic-fallback\resources\animation-trees-k2-base.js'
OUT_PATH   = BASE_PATH

# ── helpers ────────────────────────────────────────────────────────────────

def entry_key(e):
    return (e.get('trigger'), e.get('role'),
            json.dumps(e.get('predicate', []), sort_keys=True), e.get('file'))

def add_entry(lst, entry):
    if isinstance(entry, dict) and entry_key(entry) not in {entry_key(e) for e in lst}:
        lst.append(entry)

def parse_trees(content):
    """
    Extract all 'slug': [...] entries from an animation-trees.js file.
    Uses bracket/string-aware counting so indented (multi-line) arrays work.
    Merges duplicate slug keys.
    """
    obj_start = content.index('{\n') + 2
    obj_end   = content.rfind('\n};\n')
    body      = content[obj_start:obj_end]

    slug_entries = {}   # slug -> [entries]
    slug_order   = []   # first-seen insertion order

    pos = 0
    while pos < len(body):
        nl   = body.find('\n', pos)
        line = body[pos:nl] if nl != -1 else body[pos:]
        stripped = line.lstrip()
        indent   = len(line) - len(stripped)

        if indent == 4 and stripped.startswith('"'):
            end_q = stripped.index('"', 1)
            slug  = stripped[1:end_q]
            try:
                bk_abs = body.index('[', pos)
            except ValueError:
                pos = (nl + 1) if nl != -1 else len(body)
                continue

            # Walk forward counting brackets (skip over string literals)
            depth, j, in_str, esc = 0, bk_abs, False, False
            while j < len(body):
                ch = body[j]
                if esc:
                    esc = False
                elif in_str and ch == chr(92):   # backslash
                    esc = True
                elif ch == '"':
                    in_str = not in_str
                elif not in_str:
                    if ch == '[':
                        depth += 1
                    elif ch == ']':
                        depth -= 1
                        if depth == 0:
                            break
                j += 1

            array_str = body[bk_abs:j + 1]
            try:
                entries = json.loads(array_str)
                if slug not in slug_entries:
                    slug_entries[slug] = []
                    slug_order.append(slug)
                for entry in entries:
                    add_entry(slug_entries[slug], entry)
            except Exception as e:
                print(f"  PARSE ERR '{slug}': {e}", file=sys.stderr)

            pos = j + 1
            continue

        pos = (nl + 1) if nl != -1 else len(body)

    return slug_entries, slug_order

# ── load K2 base ───────────────────────────────────────────────────────────

k2_content           = open(K2_PATH, encoding='utf-8').read()
slug_entries, slug_order = parse_trees(k2_content)
print(f"K2 base: {len(slug_order)} slugs")
for chk in ['acid-splash', 'electric-arc', 'produce-flame', 'gale-blast', 'spout']:
    n = len(slug_entries.get(chk, []))
    flag = '' if chk in slug_entries else ' MISSING'
    print(f"  {chk}: {n} entries{flag}")

# ── manually authored entries (K3-K5) ──────────────────────────────────────
# Stored as a list of (slug, entry) pairs to avoid Python dict duplicate-key
# silently-drops-earlier-values problem.

fail_pred = [{"or": ["check:outcome:failure", "check:outcome:critical-failure"]}]

def ar(role, file, pred=None):
    return {"trigger": "attack-roll",   "role": role, "predicate": pred or [], "file": file}
def sv(role, file, pred=None):
    return {"trigger": "saving-throw",  "role": role, "predicate": pred or [], "file": file}
def dt(role, file, pred=None):
    return {"trigger": "damage-taken",  "role": role, "predicate": pred or [], "file": file}
def dr(role, file, pred=None):
    return {"trigger": "damage-roll",   "role": role, "predicate": pred or [], "file": file}

MANUAL_PAIRS = [

    # 8.3.5 — self-buff and impact cantrips
    ("clinging-ice",    ar("impact",   "jb2a.ice_spikes.white")),
    ("shield",          ar("tokenBuff","jb2a.shield.01")),
    ("shroud-of-night", ar("tokenBuff","jb2a.darkness.black")),
    ("tangle-vine",     ar("impact",   "jb2a.vine.complete")),

    # 8.3.6 — bard cantrips
    ("allegro",           ar("tokenBuff","jb2a.bardic_inspiration.01.bluepurple")),
    ("courageous-anthem", ar("tokenBuff","jb2a.bardic_inspiration.02.bluepurple")),
    ("dirge-of-doom",     ar("tokenBuff","jb2a.markers.music.blueyellow")),
    ("dirge-of-doom",     ar("impact",   "jb2a.markers.evil.darkred")),
    ("rallying-anthem",   ar("tokenBuff","jb2a.bardic_inspiration.03.bluepurple")),
    ("song-of-marching",  ar("tokenBuff","jb2a.bardic_inspiration.04.bluepurple")),
    ("song-of-strength",  ar("tokenBuff","jb2a.condition.boon.01.001.blue")),
    ("triple-time",       ar("tokenBuff","jb2a.bardic_inspiration.05.bluepurple")),
    ("uplifting-overture",ar("tokenBuff","jb2a.condition.boon.01.011.yellow")),

    # 8.3.7 — utility cantrips
    ("figment",          ar("impact",   "jb2a.gust_of_wind.default")),
    ("forbidding-ward",  ar("tokenBuff","jb2a.on_token_buff.002.002")),
    ("forbidding-ward",  ar("impact",   "jb2a.condition.boon.01.011.yellow")),
    ("guidance",         ar("impact",   "jb2a.guiding_bolt.01.greenorange")),
    ("light",            ar("tokenBuff","jb2a.dancing_light.blueteal")),
    ("prestidigitation", ar("tokenBuff","jb2a.arcane_hand.purple")),
    ("read-aura",        ar("tokenBuff","jb2a.detect_magic.circle.green")),
    ("stabilize",        ar("impact",   "jb2a.healing_generic.200px.purple")),

    # 8.3.8 — remaining PC cantrips
    ("discern-secrets",         ar("tokenBuff","jb2a.on_token_buff.001.004.bluepurple")),
    ("evil-eye",                ar("tokenBuff","jb2a.on_token_cast.initiate.001.instant.combined.greenpurple")),
    ("evil-eye",                ar("impact",   "jb2a.eyes")),
    ("house-of-imaginary-walls",ar("impact",   "jb2a.energy_wall.01.circle.500x500.01.complete.blue")),
    ("know-the-way",            ar("tokenBuff","jb2a.on_token_buff.001.001.pinkyellow")),
    ("message",                 ar("projectile","jb2a.guiding_bolt.02.purplepink")),
    ("nudge-fate",              ar("tokenBuff","jb2a.on_token_cast.initiate.001.instant.combined.blueteal")),
    ("nudge-fate",              ar("impact",   "jb2a.on_token_buff.003.004.blue")),
    ("sigil",                   ar("impact",   "jb2a.magic_signs.rune")),
    ("stoke-the-heart",         ar("impact",   "jb2a.condition.boon.01.001.red")),
    ("summon-instrument",       ar("tokenBuff","jb2a.markers.music")),
    ("telekinetic-hand",        ar("tokenBuff","jb2a.arcane_hand")),
    ("wilding-word",            ar("tokenBuff","jb2a.condition.boon.01.023.green")),
    ("wilding-word",            ar("impact",   "jb2a.condition.curse.01.023.purple")),

    # 8.3.9 — PC2 cantrips: attack-roll areaEffect (cone/burst) and projectile
    ("bullhorn",      ar("projectile","jb2a.soundwave.01.blue")),
    ("live-wire",     ar("projectile","jb2a.lightning_orb.01.loop.bluepurple.0")),
    ("gale-blast",    ar("areaEffect","jb2a.whirlwind.bluegrey")),
    ("haunting-hymn", ar("areaEffect","jb2a.side_impact.part.slow.music_note.pink", ["jb2a:patreon"])),
    ("haunting-hymn", ar("areaEffect","jb2a.side_impact.part.shockwave.blue",       ["jb2a:free"])),
    ("puff-of-poison",ar("areaEffect","jb2a.smoke.puff.side.green", ["jb2a:patreon"])),
    ("puff-of-poison",ar("areaEffect","jb2a.smoke.puff.side.grey",  ["jb2a:free"])),
    ("scatter-scree", ar("areaEffect","jb2a.falling_rocks.side.2x1.grey")),
    ("spout",         ar("areaEffect","jb2a.water_splash.circle.01.blue")),

    # K5 — saving-throw impacts (fire on failure or crit-failure)
    ("bullhorn",      sv("impact",   "jb2a.soundwave.01.blue",                              fail_pred)),
    ("gale-blast",    sv("impact",   "jb2a.whirlwind.bluegrey",                             fail_pred)),
    ("haunting-hymn", sv("impact",   "jb2a.side_impact.part.slow.music_note.pink", fail_pred + ["jb2a:patreon"])),
    ("haunting-hymn", sv("impact",   "jb2a.side_impact.part.shockwave.blue",       fail_pred + ["jb2a:free"])),
    ("puff-of-poison",sv("impact",   "jb2a.smoke.puff.side.green", fail_pred + ["jb2a:patreon"])),
    ("puff-of-poison",sv("impact",   "jb2a.smoke.puff.side.grey",  fail_pred + ["jb2a:free"])),
    ("scatter-scree", sv("impact",   "jb2a.falling_rocks.side.2x1.grey",                   fail_pred)),
    ("spout",         sv("impact",   "jb2a.water_splash.circle.01.blue",                   fail_pred)),
    ("wilding-word",  sv("tokenBuff","jb2a.condition.curse.01.023.purple",                 fail_pred)),
]

# Merge manual entries (add new slugs at end; merge into existing)
for slug, entry in MANUAL_PAIRS:
    if slug not in slug_entries:
        slug_entries[slug] = []
        slug_order.append(slug)
    add_entry(slug_entries[slug], entry)

# ── rebuild file ───────────────────────────────────────────────────────────

header_end = k2_content.index('{\n') + 2
header     = k2_content[:header_end]
footer_s   = k2_content.rfind('\n};\n')
footer     = k2_content[footer_s:]

lines = []
for i, slug in enumerate(slug_order):
    comma = ',' if i < len(slug_order) - 1 else ''
    lines.append(f'    "{slug}": {json.dumps(slug_entries[slug], separators=(",", ":"))}{comma}')

new_content = header + '\n'.join(lines) + '\n' + footer
open(OUT_PATH, 'w', encoding='utf-8').write(new_content)

# ── report ─────────────────────────────────────────────────────────────────
print(f"\nFinal file: {len(slug_order)} unique slugs")
for chk in ['acid-splash', 'electric-arc', 'produce-flame', 'gale-blast', 'spout',
            'wilding-word', 'bullhorn', 'live-wire', 'dirge-of-doom']:
    entries = slug_entries.get(chk, [])
    triggers = sorted({e['trigger'] for e in entries})
    print(f"  {chk}: {len(entries)} entries  triggers={triggers}")
