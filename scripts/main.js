/**
 * PF2e Heuristic Fallback Animation Engine
 * Version: 7.1.1+ Enhanced (With Layered Classification System)
 *
 * Part 1.1: Added non-breaking enhanced classification layer
 * - Original keyword routing remains fully functional
 * - New classification is opt-in via "advancedClassification" setting
 * - Layers richer spell understanding without replacing existing logic
 *
 * Part 1.2: Added asset fallback chains
 * - resolveVerifiedAssetPath() behavior unchanged for all existing callers
 * - resolveAssetWithFallback() tries EXPLICIT_DATABASE_MAP first, then a
 *   small ASSET_FALLBACK_CHAIN of generic JB2A paths before giving up
 * - Always degrades gracefully to null, never throws
 *
 * Phase A: Added curated spell support
 * - getCuratedSpellSet() indexes macro names from the "PF2e Animation
 *   Macros (JB2A)" module (pf2e-jb2a-macros), if installed and active
 * - Spells matching a curated macro are skipped by the heuristic engine
 *   (opt-out via "skipCuratedSpells" setting, default on)
 * - CURATED_SET_EXCLUDE filters out admin/utility macros (e.g. "Cone
 *   Template", "Export Autorec JSON") whose generic names could collide
 *   with real spell slugs
 * - If the module/pack is unavailable, the set is empty and behavior is
 *   identical to before this phase
 *
 * Phase B: Enhanced keyword classification
 * - ENHANCED_KEYWORD_MAP adds school/tradition/condition keyword detection
 *   as a fallback when spell traits don't directly name them
 * - Detects restraint/CC condition keywords (entangled, restrained,
 *   immobilized, grabbed, paralyzed) and records them on the config for a
 *   future Phase G persistent-effects system
 * - Entirely gated behind "advancedClassification" (same flag as Part 1.1);
 *   no effect when that setting is off
 *
 * Phase C: Random animation variants
 * - resolveAssetVariants() collects every EXPLICIT_DATABASE_MAP pattern for
 *   an asset type/color that resolves to a valid Sequencer entry
 * - When "randomVariants" is enabled and 2+ variants exist, config gets a
 *   `<assetType>Variants` array; .file() is called with that array so
 *   Sequencer picks one at random per cast
 * - Default off; with 0-1 variants (the common case), behavior is identical
 *   to before this phase
 *
 * Phase D: Concurrency protection
 * - activeSequences tracks how many heuristic animation sequences are
 *   currently mid-flight (incremented/decremented around the full
 *   sequence build + seq.play())
 * - "maxConcurrentAnimations" (default 4, range 1-16) caps how many can run
 *   at once; additional casts are skipped (not queued) once the cap is hit
 * - seq.play() is now awaited so the counter accurately reflects in-progress
 *   playback, not just sequence construction
 *
 * Bugfix: PHASE 5 (Token Buff route) called the non-existent Sequencer
 * method .tieToToken(); replaced with the correct .attachTo(token).
 *
 * Phase E: Configuration caching
 * - CONFIG_CACHE memoizes parseSpellToAnimation() results per spell
 *   (keyed by uuid/id/name), so repeat casts skip re-parsing/re-classifying
 * - Gated behind "enableConfigCache" (default on); when off, behavior is
 *   identical to before this phase
 * - Cache auto-clears once it exceeds CONFIG_CACHE_LIMIT (500) entries
 *
 * Phase F: Template placement handling
 * - listenForTemplatePlacement() waits (up to 5s) for the player to place a
 *   measured template, resolving with the template or null on timeout
 * - For "burst"-type animations on spells with an area (spell.system.area),
 *   the ground ring/impact center on the placed template's position when
 *   available, falling back to target/self positioning otherwise
 * - Gated behind "useTemplateHandling" (default off); when off, behavior is
 *   identical to before this phase
 *
 * Phase G: Persistent crowd-control effects (beta, opt-in)
 * - createItem/deleteItem hooks watch for restraint conditions (immobilized,
 *   restrained, paralyzed, grabbed) and attach/remove a looping overlay
 *   effect on the affected token via Sequencer's .persist()
 * - Effects are named "restraint-{tokenId}-{slug}" for reliable cleanup;
 *   a deleteToken hook fail-safes any lingering effects on token removal
 * - Gated behind "enableCCEffects" (default off); every hook handler is
 *   wrapped in try/catch so failures here are non-fatal and never affect
 *   the rest of the module
 * - resolveCCOverlay() picks the first valid overlay from
 *   CC_OVERLAY_CANDIDATES (memoized) as defense-in-depth in case an
 *   overlay path is unavailable in a given JB2A install
 *
 * Bugfix: ENHANCED_CLASSIFICATION.restraints overlay paths referenced
 * non-existent JB2A assets ("jb2a.chains.standard",
 * "jb2a.spectral_chains.standard", "jb2a.vines.growth.green"). Replaced
 * with valid looping assets (jb2a.markers.chain.diamond.loop.01.grey/purple,
 * jb2a.entangle.02.loop.02.green) suitable for persist().
 *
 * Phase H: Elemental area shapes + expanded element coverage
 * - parseSpellToAnimation() now checks spell.system.traits.value for a
 *   KEYWORD_MAP match before falling back to description-string search,
 *   which is more reliable than text matching
 * - KEYWORD_MAP expanded to cover the full PF2e damage/alignment trait set
 *   (mental, vitality/positive/radiant, chaotic, evil, good, lawful, bleed,
 *   negative)
 * - For spells with area.type "cone" or "line", resolveElementalAreaAsset()
 *   picks an element-specific JB2A breath-weapon effect (fire/cold/acid/
 *   lightning/poison) when available; new "cone"/"line" pipelines render it
 *   rotated/stretched toward a placed template or the first target
 * - If no elemental area asset matches (e.g. mental, force), the spell falls
 *   back to its previously-determined type (burst/projectile/etc) -
 *   completely unchanged behavior for those spells
 *
 * Phase I: Structured burst detection + ring color diversity
 * - parseSpellToAnimation() now checks spell.system.area.type first for
 *   "burst"/"emanation"/"cube"/"square"/"circle" shapes and classifies the
 *   spell as type "burst" if matched, before falling back to the existing
 *   description-string search (fixes spells like emanation auras whose
 *   descriptions never say "burst"/"emanation"/etc.)
 * - Cast/ground rings previously only resolved to
 *   jb2a.magic_signs.circle.01.abjuration.{blue,green,red} and fell back to
 *   blue for every other element color. EXPLICIT_DATABASE_MAP.castRing/
 *   groundRing now try jb2a.magic_signs.circle.02.abjuration.complete.{color}
 *   first (12-color family), and RING_COLOR_ALIASES maps KEYWORD_MAP colors
 *   outside that family (orange, blueyellow, holy, pinkpurple, bluegreen,
 *   gold) to their nearest equivalent - only used for castRing/groundRing
 *   resolution, impact/projectile/tokenBuff colors are unchanged
 *
 * Phase J: PF2e Graphics asset import
 * - PF2E_GRAPHICS_ASSET_MAP (resources/extract_pf2e_graphics.py output) maps
 *   spell slugs to hand-curated JB2A asset candidates by role (projectile,
 *   impact, areaEffect), mined from the now-unmaintained PF2e Graphics
 *   module's older animation data set (76 spells)
 * - parseSpellToAnimation() applies these as overrides on top of the
 *   heuristic-derived config: projectile/impact replace the heuristic asset
 *   directly; areaEffect replaces the cone/line areaEffect or, for "burst"
 *   spells, the groundRing
 * - Each candidate is validated via isValidSequencerPath() and the first
 *   valid one wins; if none validate, the heuristic-derived asset is kept
 *   unchanged
 * - Gated behind "usePf2eGraphicsAssets" (default on)
 * - reportPf2eGraphicsCoverage() (console-only) scans all spell compendiums
 *   and logs what fraction of spells have a mapped entry, for gap-tracking
 *
 * Phase K0: Multi-file script split (no behavior change)
 * - The single ~1950-line working_version_lacking_some_content.js has been
 *   split into multiple classic scripts loaded in order via module.json's
 *   "scripts" array (all still share global scope, so top-level
 *   const/function declarations remain accessible across files):
 *     scripts/settings.js            - settings registration, getSettingSafe
 *     scripts/data/asset-maps.js     - all static dictionaries/lookup tables
 *     scripts/core/asset-resolution.js - Sequencer path resolution/validation
 *     scripts/core/spell-parser.js   - parseSpellToAnimation + classification
 *     scripts/core/animation-executor.js - Sequencer playback + chat hook
 *     scripts/core/cc-effects.js     - persistent CC overlay effects
 *     scripts/main.js                - this header + version log (loads last)
 * - working_version_lacking_some_content.js is no longer loaded by the
 *   module and is kept only as historical reference
 *
 * Phase K1: Predicate evaluation engine
 * - core/predicate-engine.js adds evaluatePredicate(predicate, context),
 *   a generic evaluator for the PF2e Graphics predicate format: arrays of
 *   strings (implicit AND) and {not|and|or|nor|gte|lte} statements.
 *   Unevaluable facts/shapes fail closed (treated as not matching).
 * - buildPredicateContext(item, options) derives a { facts, values } context
 *   from a PF2e item: item:trait:X / origin:item:trait:X, melee/ranged/
 *   thrown, action:cost:N, jb2a:patreon/jb2a:free (via module detection), and
 *   settings:quality / settings:persistent (new settings, see below).
 * - New settings: "animationQualityLevel" (0-3, default 1) and
 *   "usePersistentAnimations" (default off) back the settings:* facts.
 * - Purely additive - not yet called from anywhere in the cast pipeline.
 *
 * Phase K2: Predicate-tree animation data + resolver
 * - resources/extract_pf2e_animation_trees.py walks animations_old/spells/**
 *   and flattens each trigger-group's predicate tree into a candidate list
 *   per spell slug: { trigger, role, predicate, file }, where "predicate" is
 *   the full accumulated predicate (group predicate + every ancestor
 *   "predicate" array on the path to that file). Resolves PF2e Graphics'
 *   alias entries (e.g. "item:slug:heal-animal" -> "item:slug:heal").
 *   Output: data/animation-trees.js (PF2E_ANIMATION_TREES, 86 spell slugs).
 * - resolveAnimationTreeAsset(slug, trigger, role, context) in
 *   core/animation-tree-resolver.js filters PF2E_ANIMATION_TREES[slug] by
 *   trigger/role, evaluates each candidate's predicate via
 *   evaluatePredicate(), and returns the first whose predicate matches and
 *   whose file validates via isValidSequencerPath().
 * - Purely additive - not yet wired into parseSpellToAnimation(). This lays
 *   the groundwork for a future phase to (a) replace the flat
 *   PF2E_GRAPHICS_ASSET_MAP cast-time override with predicate-aware
 *   resolution, and (b) add new non-cast triggers (attack-roll, etc.) for
 *   weapons/class abilities/actions using the same engine.
 */

// (Module bootstrap order: settings -> data/asset-maps -> data/animation-trees -> core/asset-resolution -> core/predicate-engine -> core/animation-tree-resolver -> core/spell-parser -> core/animation-executor -> core/cc-effects -> main)

console.log("PF2e Heuristic Fallback Engine | Version 8.0.0 (Classification Layer + Asset Fallback Chains + Curated Spell Support + Enhanced Keyword Classification + Random Variants + Concurrency Protection + Configuration Caching + Template Placement Handling + Persistent CC Effects + Elemental Area Shapes + Structured Burst Detection + Ring Color Diversity + PF2e Graphics Asset Import + Modular File Structure + Predicate Evaluation Engine + Predicate-Tree Animation Data)");
