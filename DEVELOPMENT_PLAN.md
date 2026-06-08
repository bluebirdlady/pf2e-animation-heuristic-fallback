# Development Plan: Restoring Lost Capability to Stable Foundation

**Objective**: Incrementally reintroduce the sophisticated features from v4.8 into the v7.1.1 stable codebase without sacrificing reliability or introducing the original bugs.

**Core Principle**: Treat v7.1.1 as the immovable foundation. Each feature adds one isolated subsystem at a time, tested independently before integration.

---

## Part 1: Architectural Foundation (Preparatory Phase)

### 1.1 Extend the Classification System (Non-Breaking)

**Goal**: Layer a richer classification dictionary *alongside* the existing keyword-based routing, not replacing it.

**Approach**:
- Create a new `ENHANCED_CLASSIFICATION` object that mirrors `JB2A_DICT` from v4.8
- Add a new `classifySpell()` function that runs *after* keyword matching
- Make classification opt-in via a new setting: `"advancedClassification"`
- Keep all existing routing intact

**Implementation Strategy**:
```javascript
// NEW: Enhanced classification layer (only runs if enabled)
const ENHANCED_CLASSIFICATION = {
    traditions: {
        arcane: "jb2a.magic_signs.circle.02.enchantment.intro",
        divine: "jb2a.magic_signs.circle.02.abjuration.intro",
        occult: "jb2a.magic_signs.circle.02.necromancy.intro",
        primal: "jb2a.magic_signs.circle.02.conjuration.intro"
    },
    schools: {
        evocation: { overlay: "jb2a.energy_strands", color: "red" },
        // ... etc
    },
    restraints: {
        nature: { ground: "jb2a.entangle.green", overlay: "jb2a.vines.growth.green" },
        // ... etc
    }
};

// NEW: Classification function (fallback to keyword if disabled)
function classifySpellEnhanced(spell, baseConfig) {
    if (!getSettingSafe("advancedClassification")) {
        return baseConfig; // Pass through unchanged
    }
    
    // Extract traits from spell.system.traits.value
    const traits = spell.system?.traits?.value || [];
    
    // Apply tradition overlay if present
    const traditionKey = traits.find(t => ENHANCED_CLASSIFICATION.traditions[t]);
    if (traditionKey) {
        baseConfig.traditionCircle = ENHANCED_CLASSIFICATION.traditions[traditionKey];
    }
    
    // Apply school overlay if present
    const schoolKey = traits.find(t => ENHANCED_CLASSIFICATION.schools[t]);
    if (schoolKey) {
        baseConfig.schoolOverlay = ENHANCED_CLASSIFICATION.schools[schoolKey];
    }
    
    return baseConfig;
}
```

**Benefits**:
- Non-breaking: existing behavior unchanged if disabled
- Easy to test: just enable the setting
- Additive: layers onto existing keyword detection
- Low risk: if classification fails, keyword routing still works

**Testing Checklist**:
- [ ] Test with setting disabled (behavior unchanged)
- [ ] Test with setting enabled (no errors thrown)
- [ ] Verify that spell cast still produces valid animation
- [ ] Check for performance impact (should be minimal)

**Lines of Code**: ~80  
**Risk Level**: 🟢 Very Low (non-breaking, feature-flagged)

---

### 1.2 Build an Asset Verification Cache with Validation Strategy

**Goal**: Extend the existing asset validation to be more forgiving but still safe.

**Approach**:
- Keep `resolveVerifiedAssetPath()` exactly as is
- Add a `FALLBACK_CHAIN` system for each asset type
- Build a "graceful degradation" pattern

**Implementation Strategy**:
```javascript
// NEW: Graceful fallback chains
const ASSET_FALLBACK_CHAIN = {
    castRing: [
        // Try color-specific first
        (color) => `jb2a.magic_signs.circle.02.abjuration.${color}`,
        // Fall back to blue
        () => `jb2a.magic_signs.circle.02.abjuration.blue`,
        // Ultimate fallback
        () => "jb2a.magic_signs.circle.ground.blue"
    ],
    impact: [
        (color) => `jb2a.impact.001.${color}`,
        (color) => `jb2a.impact.themed.${color}`,
        () => "jb2a.impact.001.blue"
    ]
};

// NEW: Smart fallback resolver
function resolveAssetWithFallback(assetType, preferredColor) {
    const chains = ASSET_FALLBACK_CHAIN[assetType] || [];
    
    for (const chainFn of chains) {
        const path = chainFn(preferredColor);
        const verified = resolveVerifiedAssetPath(assetType, preferredColor);
        if (verified) return verified;
    }
    
    return null; // Gracefully return null rather than throwing
}
```

**Benefits**:
- Maintains safety of v7.1.1's verification
- Adds flexibility for custom/extended JB2A libraries
- Prevents animation failures from cascading

**Lines of Code**: ~50  
**Risk Level**: 🟢 Very Low (extension, no changes to existing logic)

---

## Part 2: Feature Restoration (Incremental Phases)

### Phase A: Curated Spell Support (Highest Priority / Lowest Risk)

**Goal**: Reintroduce the curated spell database lookup as a first-pass router.

**Why First**: 
- Self-contained (doesn't depend on other subsystems)
- Dramatically improves quality for known spells
- Minimal performance cost
- Cannot cause cascading failures

**Implementation**:

```javascript
// RESTORE: getCuratedSpellSet() from v4.8 (unchanged)
function getCuratedSpellSet() {
    if (globalThis._CURATED_SPELL_CACHE) return globalThis._CURATED_SPELL_CACHE;
    
    try {
        const macroPack = game.packs.get("pf2e-jb2a-macros.pf2e-jb2a-macros");
        if (!macroPack) return new Set();
        globalThis._CURATED_SPELL_CACHE = new Set(
            macroPack.index.map(e => (e.slug || e.name).toLowerCase())
        );
        return globalThis._CURATED_SPELL_CACHE;
    } catch (e) {
        console.warn("PF2e Heuristic | Curated spell pack unavailable:", e.message);
        return new Set();
    }
}

// MODIFY: parseSpellToAnimation() to check curated set first
function parseSpellToAnimation(spell) {
    const searchString = `${spell.name} ${spell.system?.description?.value || ""}`.toLowerCase();
    
    // NEW: Try curated set first
    const curatedSet = getCuratedSpellSet();
    const spellSlug = (spell.slug || spell.name.toLowerCase()).trim();
    if (curatedSet.has(spellSlug) || curatedSet.has(spell.name.toLowerCase())) {
        console.log(`PF2e Heuristic | Using curated animation for: ${spell.name}`);
        // Return a special marker that tells executeHeuristicAnimation to skip to macro execution
        return { type: "CURATED_SPELL", spellSlug, originalSpellName: spell.name };
    }
    
    // EXISTING: Fall through to keyword routing
    let config = {
        color: "blue",
        type: "projectile",
        blend: false
    };
    
    // ... rest of existing keyword logic unchanged ...
    
    return config;
}

// MODIFY: executeHeuristicAnimation() to respect curated flag
async function executeHeuristicAnimation(spell, token) {
    if (!token || !canvas.tokens?.placeables.includes(token)) return;
    
    const animationConfig = parseSpellToAnimation(spell);
    
    // NEW: Curated spell bypass
    if (animationConfig.type === "CURATED_SPELL") {
        console.log(`PF2e Heuristic | Skipping heuristic for curated spell: ${animationConfig.originalSpellName}`);
        // Let the macro system or other handlers take over
        return;
    }
    
    // EXISTING: Continue with heuristic animation
    // ... rest of existing code unchanged ...
}
```

**Testing Checklist**:
- [ ] Verify curated spell pack is found (check console)
- [ ] Cast a known PF2e-JB2A curated spell, confirm it uses macro
- [ ] Cast a non-curated spell, confirm heuristic still works
- [ ] Test with curated pack unavailable (should not error)
- [ ] Verify cache is populated only once

**Lines of Code**: ~40  
**Risk Level**: 🟢 Very Low (optional pass-through, no behavior change if curated pack unavailable)

**Effort**: 2-3 hours  
**Testing**: 1 hour

---

### Phase B: Enhanced Keyword Classification (Low Risk)

**Goal**: Expand keyword detection to include school/tradition/restraint keywords.

**Why Here**: 
- Builds on Phase A
- Improves heuristic routing without introducing complex logic
- Remains fully within existing keyword framework

**Implementation**:

```javascript
// RESTORE & EXPAND: Enhanced keyword detection
const ENHANCED_KEYWORD_MAP = {
    // EXISTING: Damage keywords
    fire: { color: "orange", trait: "fire" },
    // ... all existing mappings ...
    
    // NEW: School keywords (for school overlays)
    evocation: { school: "evocation", color: "red" },
    enchantment: { school: "enchantment", color: "pink" },
    abjuration: { school: "abjuration", color: "blue" },
    necromancy: { school: "necromancy", color: "dark_purple" },
    
    // NEW: Condition keywords (for restraint detection)
    entangle: { condition: "entangled", role: "restraint" },
    restrain: { condition: "restrained", role: "restraint" },
    immobilize: { condition: "immobilized", role: "restraint" },
    paralyze: { condition: "paralyzed", role: "restraint" },
    
    // NEW: Tradition keywords
    arcane: { tradition: "arcane" },
    divine: { tradition: "divine" },
    occult: { tradition: "occult" },
    primal: { tradition: "primal" }
};

// MODIFY: parseSpellToAnimation() to detect these new dimensions
function parseSpellToAnimation(spell) {
    const searchString = `${spell.name} ${spell.system?.description?.value || ""}`.toLowerCase();
    const spellTraits = spell.system?.traits?.value || [];
    
    let config = {
        color: "blue",
        type: "projectile",
        blend: false,
        school: null,
        tradition: null,
        detectedConditions: []
    };
    
    // EXISTING: Damage keyword matching
    for (const [keyword, data] of Object.entries(ENHANCED_KEYWORD_MAP)) {
        if (searchString.includes(keyword) || spellTraits.includes(keyword)) {
            if (data.color && !config.color.includes("blue")) {
                config.color = data.color;
            }
            if (data.school) config.school = data.school;
            if (data.tradition) config.tradition = data.tradition;
            if (data.condition) config.detectedConditions.push(data.condition);
        }
    }
    
    // NEW: Check spell traits for direct classification
    if (!config.school) {
        config.school = spellTraits.find(t => ["evocation", "abjuration", "enchantment", "necromancy"].includes(t));
    }
    if (!config.tradition) {
        config.tradition = spellTraits.find(t => ["arcane", "divine", "occult", "primal"].includes(t));
    }
    
    // ... rest of existing type detection ...
    
    return config;
}
```

**Benefits**:
- Better spell classification without new hooks
- Enables school overlays (visual polish)
- Detects restraint conditions for future Phase D
- Still 100% keyword-based (fast, reliable)

**Lines of Code**: ~50  
**Risk Level**: 🟢 Very Low (additive fields, no behavioral changes to existing routing)

**Effort**: 2-3 hours  
**Testing**: 1.5 hours

---

### Phase C: Random Animation Variants (Low Risk / High Quality-of-Life)

**Goal**: Restore the `maybeRandomize()` system from v4.8.

**Why Here**: 
- Pure cosmetic (doesn't break if disabled)
- Improves user experience noticeably
- No dependencies on other systems
- Safe to feature-flag

**Implementation**:

```javascript
// RESTORE: Random variant system
function maybeRandomize(path, enabled = true) {
    if (!enabled) return path;
    
    // Only randomize if the setting is enabled
    if (!getSettingSafe("randomVariants")) return path;
    
    try {
        // Try to randomize asset name
        const variant = String(Math.floor(Math.random() * 3) + 1).padStart(2, '0');
        
        if (/\.(webm|png)$/i.test(path)) {
            const testPath = path.replace(/\.(webm|png)$/i, `_v${variant}.$1`);
            // Quick verification before returning
            if (Sequencer?.Database?.hasEntry?.(testPath)) {
                return testPath;
            }
        }
        
        // Fallback: return original
        return path;
    } catch (e) {
        console.debug("PF2e Heuristic | Randomization error (non-critical):", e.message);
        return path;
    }
}

// MODIFY: Add randomVariants setting
const registerSettings = () => {
    // ... existing settings ...
    
    safeRegister("randomVariants", {
        name: "Use Random Asset Variants",
        hint: "Add subtle visual variety by randomizing animation suffixes where supported.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
};

// MODIFY: Apply randomization to projectiles and token effects
function executeHeuristicAnimation(spell, token) {
    // ... existing code ...
    
    // In PHASE 2: Tactical Routing Traversal (Projectiles)
    if (animationConfig.type === "projectile" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.projectile) {
                let projectilePath = maybeRandomize(animationConfig.projectile);
                // ... rest of effect setup ...
            }
        }
    }
    
    // In PHASE 5: Utility / Personal Buff Route
    else {
        if (animationConfig.tokenBuff) {
            let buffPath = maybeRandomize(animationConfig.tokenBuff);
            // ... rest of effect setup ...
        }
    }
}
```

**Testing Checklist**:
- [ ] Test with randomVariants disabled (original behavior)
- [ ] Test with randomVariants enabled (variants play when available)
- [ ] Cast same spell 5 times, verify animations differ
- [ ] Test with spells that have no variants (fallback to original)
- [ ] Verify no console errors when variants don't exist

**Lines of Code**: ~40  
**Risk Level**: 🟢 Very Low (feature-flagged, gracefully degrades)

**Effort**: 1.5 hours  
**Testing**: 1 hour

---

### Phase D: Concurrency Protection (Low Risk / High Stability Benefit)

**Goal**: Restore the `activeSequences` / `MAX_CONCURRENT` throttling from v4.8.

**Why Here**: 
- Defensive feature (makes system *more* stable)
- Isolates animation spam in large encounters
- Simple state tracking
- No external dependencies

**Implementation**:

```javascript
// RESTORE: Concurrency tracking
let activeSequences = 0;
const MAX_CONCURRENT = getSettingSafe("maxConcurrentAnimations") || 4;

// NEW: Add setting for concurrency control
const registerSettings = () => {
    // ... existing settings ...
    
    safeRegister("maxConcurrentAnimations", {
        name: "Max Concurrent Animations",
        hint: "Limit simultaneous animation sequences to prevent performance issues.",
        scope: "client",
        config: true,
        type: Number,
        range: { min: 1, max: 16, step: 1 },
        default: 4
    });
};

// MODIFY: executeHeuristicAnimation() to respect concurrency limit
async function executeHeuristicAnimation(spell, token) {
    if (!token || !canvas.tokens?.placeables.includes(token)) return;
    
    // NEW: Concurrency check
    const MAX = getSettingSafe("maxConcurrentAnimations") || 4;
    if (activeSequences >= MAX) {
        console.debug(`PF2e Heuristic | Max concurrent animations (${MAX}) reached, queuing...`);
        // Option 1: Skip this animation
        // return;
        
        // Option 2: Queue it (optional, more complex)
        // await new Promise(resolve => {
        //     const check = setInterval(() => {
        //         if (activeSequences < MAX) {
        //             clearInterval(check);
        //             resolve();
        //         }
        //     }, 100);
        // });
        
        // For initial phase, just skip
        return;
    }
    
    const SequenceClass = typeof Sequence !== 'undefined' ? Sequence : game.modules.get("sequencer")?.api?.Sequence;
    if (!SequenceClass) return;
    
    const animationConfig = parseSpellToAnimation(spell);
    // ... rest of existing animation logic ...
    
    activeSequences++;
    
    try {
        // ... animation setup ...
        await seq.play();
    } catch (e) {
        console.error("PF2e Heuristic | Animation execution error:", e);
    } finally {
        activeSequences--;
    }
}
```

**Testing Checklist**:
- [ ] Cast 5 spells rapidly, verify only 4 play simultaneously
- [ ] Verify activeSequences counter decreases after animations finish
- [ ] Test with concurrency setting at different values (1, 4, 8, 16)
- [ ] Verify no memory leaks (counter resets properly)
- [ ] Test in large encounter with many AOE spells

**Lines of Code**: ~35  
**Risk Level**: 🟢 Very Low (additive safety mechanism)

**Effort**: 2 hours  
**Testing**: 1.5 hours

---

### Phase E: Configuration Caching (Very Low Risk / Micro-optimization)

**Goal**: Restore `CONFIG_CACHE` to avoid re-parsing the same spell twice.

**Why Here**: 
- Pure optimization (invisible to user)
- Very low risk of side effects
- Easy to disable/clear if issues arise

**Implementation**:

```javascript
// RESTORE: Configuration cache
const CONFIG_CACHE = new Map();

// NEW: Add cache management setting
const registerSettings = () => {
    // ... existing settings ...
    
    safeRegister("enableConfigCache", {
        name: "Enable Configuration Cache",
        hint: "Cache spell parsing results for performance (disable if you encounter stale data).",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
};

// MODIFY: parseSpellToAnimation() to check cache first
function parseSpellToAnimation(spell) {
    const enableCache = getSettingSafe("enableConfigCache");
    const cacheKey = spell.uuid || spell.id || spell.name;
    
    // NEW: Cache lookup
    if (enableCache && CONFIG_CACHE.has(cacheKey)) {
        return CONFIG_CACHE.get(cacheKey);
    }
    
    // ... existing parsing logic ...
    
    const config = {
        color: "blue",
        type: "projectile",
        blend: false,
        // ... other fields ...
    };
    
    // NEW: Cache storage
    if (enableCache && cacheKey) {
        CONFIG_CACHE.set(cacheKey, config);
    }
    
    return config;
}

// NEW: Cache clearing on chat message (optional)
Hooks.on("createChatMessage", (message, options, userId) => {
    if (userId !== game.user.id) return;
    
    // Optional: Clear cache periodically to avoid stale data
    // CONFIG_CACHE.clear();
    
    // Safer: Clear cache only if size exceeds threshold
    if (CONFIG_CACHE.size > 500) {
        CONFIG_CACHE.clear();
        console.debug("PF2e Heuristic | Config cache cleared (size limit reached)");
    }
});
```

**Testing Checklist**:
- [ ] Cast same spell twice, verify it uses cache (check console logs)
- [ ] Disable cache, verify behavior unchanged
- [ ] Cast 500+ different spells, verify cache clears automatically
- [ ] Measure performance impact (should be minimal)

**Lines of Code**: ~25  
**Risk Level**: 🟢 Very Low (can be disabled, auto-clears)

**Effort**: 1 hour  
**Testing**: 1 hour

---

### Phase F: Template Placement Handling (Medium Risk / High Impact)

**Goal**: Restore support for area spells (cones, bursts, lines) that require template placement.

**Why Here**: 
- Depends on earlier phases for stability
- Most complex feature to restore
- Requires careful async handling to avoid hanging
- Should be feature-flagged initially

**Implementation**:

```javascript
// RESTORE: Template listening function
function listenForTemplatePlacement(timeoutMs = 5000) {
    return new Promise((resolve) => {
        let hookId = null;
        let timer = null;
        
        const cleanup = () => {
            if (hookId !== null) Hooks.off("createMeasuredTemplate", hookId);
            if (timer !== null) clearTimeout(timer);
        };
        
        hookId = Hooks.once("createMeasuredTemplate", (templateDoc) => {
            cleanup();
            console.debug("PF2e Heuristic | Template placement detected");
            resolve(templateDoc.object);
        });
        
        timer = setTimeout(() => {
            cleanup();
            console.debug("PF2e Heuristic | Template placement timeout");
            resolve(null);
        }, timeoutMs);
    });
}

// NEW: Feature flag for template handling
const registerSettings = () => {
    // ... existing settings ...
    
    safeRegister("useTemplateHandling", {
        name: "Enable Template Placement Handling",
        hint: "Wait for user to place templates before playing area spell animations.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false // Start disabled for testing
    });
};

// MODIFY: executeHeuristicAnimation() to support templates
async function executeHeuristicAnimation(spell, token) {
    if (!token || !canvas.tokens?.placeables.includes(token)) return;
    
    const animationConfig = parseSpellToAnimation(spell);
    const targets = Array.from(game.user.targets).filter(t => t && canvas.tokens?.placeables.includes(t));
    const SequenceClass = typeof Sequence !== 'undefined' ? Sequence : game.modules.get("sequencer")?.api?.Sequence;
    if (!SequenceClass) return;
    
    // NEW: Template handling setup
    let templatePromise = null;
    const useTemplates = getSettingSafe("useTemplateHandling");
    
    if (useTemplates && spell.system?.area?.type) {
        console.debug(`PF2e Heuristic | Awaiting template for ${spell.name}...`);
        templatePromise = listenForTemplatePlacement(5000);
        
        // Safety: if user doesn't place template in 5s, proceed anyway
        const template = await templatePromise;
        if (template) {
            console.debug("PF2e Heuristic | Template received, proceeding with animation");
        } else {
            console.debug("PF2e Heuristic | No template placed, using fallback positioning");
        }
    }
    
    let seq = new SequenceClass();
    activeSequences++;
    
    try {
        // ... existing phase 1-2 setup ...
        
        // NEW: Template-aware routing
        if (animationConfig.type === "burst" || animationConfig.type === "area") {
            let areaTemplate = templatePromise ? await templatePromise : null;
            if (!areaTemplate) areaTemplate = canvas.templates.active;
            
            if (areaTemplate) {
                console.log(`PF2e Heuristic | Using template at (${areaTemplate.position.x}, ${areaTemplate.position.y})`);
                seq.effect()
                    .file(animationConfig.groundRing || animationConfig.tokenBuff)
                    .atLocation(areaTemplate.position)
                    .size(4, { gridUnits: true })
                    .duration(3000)
                    .fadeIn(300)
                    .fadeOut(800);
            } else {
                // Fallback to target-based positioning
                console.log("PF2e Heuristic | No template, using target fallback");
                const center = targets.length > 0 ? targets[0] : token;
                seq.effect()
                    .file(animationConfig.groundRing || animationConfig.tokenBuff)
                    .atLocation(center)
                    .size(3, { gridUnits: true })
                    .duration(3000)
                    .fadeIn(300)
                    .fadeOut(800);
            }
        }
        
        // ... rest of existing animation logic ...
        
        await seq.play();
    } catch (e) {
        console.error("PF2e Heuristic | Animation error:", e);
    } finally {
        activeSequences--;
    }
}
```

**Testing Checklist**:
- [ ] Start with setting disabled (verify no change in behavior)
- [ ] Enable setting
- [ ] Cast cone spell, place template, verify animation uses template position
- [ ] Cast cone spell, don't place template, verify animation uses fallback (target or caster)
- [ ] Cast cone spell, place template after 5 seconds, verify it times out and uses fallback
- [ ] Verify no animation hangs or freezes
- [ ] Test with AOE spells that have templates
- [ ] Test with non-AOE spells (should ignore template logic)

**Lines of Code**: ~60  
**Risk Level**: 🟡 Medium (introduces async complexity, but well-isolated)

**Effort**: 4-5 hours  
**Testing**: 2.5 hours

---

### Phase G: Persistent Crowd-Control Effects (Higher Risk / Lower Priority)

**Goal**: Restore visual effects for restraint/crowd-control conditions.

**Why Later**:
- Requires hooking into actor state mutations (`createItem`/`deleteItem`)
- Most likely source of the original bugs
- Can be treated as optional cosmetic feature initially
- Should only be enabled for players who need it

**Implementation Strategy** (High Level):

```javascript
// NEW: Item lifecycle hooks (with robust error handling)
const CC_SLUGS = ["immobilized", "restrained", "paralyzed", "grabbed"];

// Only register if setting is enabled
const registerCCHooks = () => {
    if (!getSettingSafe("enableCCEffects")) return;
    
    Hooks.on("createItem", (item, options, userId) => {
        try {
            if (item.type !== "condition" || !CC_SLUGS.includes(item.slug)) return;
            console.debug(`PF2e Heuristic | Condition applied: ${item.slug}`);
            
            // Safely attach visual effect
            // ...
        } catch (e) {
            console.error("PF2e Heuristic | CC creation error (non-fatal):", e);
        }
    });
    
    Hooks.on("deleteItem", (item, options, userId) => {
        try {
            if (item.type !== "condition" || !CC_SLUGS.includes(item.slug)) return;
            
            // Safely clean up visual effect
            // ...
        } catch (e) {
            console.error("PF2e Heuristic | CC deletion error (non-fatal):", e);
        }
    });
};

// Register hooks only if enabled
Hooks.once("ready", () => {
    registerCCHooks();
});
```

**Critical Safeguards**:
- All item operations wrapped in try/catch
- Effects stored with `restraint-{id}` naming for reliable cleanup
- Setting defaults to OFF (opt-in)
- Includes fail-safe cleanup on actor deletion
- Clear console logging for debugging

**Testing Checklist**:
- [ ] Start with setting disabled
- [ ] Enable setting
- [ ] Apply restraint condition to token, verify visual appears
- [ ] Remove condition, verify visual disappears
- [ ] Test with multiple tokens
- [ ] Test with actor deletion (verify no orphaned effects)
- [ ] Monitor for memory leaks
- [ ] Test with high-frequency condition changes

**Lines of Code**: ~80-100  
**Risk Level**: 🟡 Medium-High (touches actor state, requires careful cleanup)

**Effort**: 5-6 hours  
**Testing**: 3 hours (rigorous)

---

## Part 3: Integration & Testing Strategy

### Incremental Testing Protocol

Each phase must pass these gates before proceeding:

1. **Unit Testing** (15 min):
   - Function works in isolation
   - No errors thrown
   - Expected output structure matches

2. **Integration Testing** (30 min):
   - New code doesn't break existing functionality
   - Settings are respected
   - Fallbacks work if new feature unavailable

3. **Gameplay Testing** (60 min):
   - Cast 10-15 different spells
   - Verify animations play correctly
   - Check console for warnings/errors
   - Monitor performance (FPS impact)

4. **Edge Case Testing** (30 min):
   - Rapid spell casting (concurrency)
   - Missing packs/assets (graceful degradation)
   - Setting toggle while active
   - Multiple players/tokens

### Recommended Phase Order

| Phase | Feature | Risk | Impact | Hours | Gate |
|-------|---------|------|--------|-------|------|
| A | Curated Spells | 🟢 V. Low | High | 3 | Merge |
| B | Enhanced Keywords | 🟢 V. Low | Medium | 3 | Merge |
| C | Random Variants | 🟢 V. Low | Low (QoL) | 2.5 | Merge |
| D | Concurrency | 🟢 V. Low | Medium | 3 | Merge |
| E | Config Cache | 🟢 V. Low | Low (Perf) | 2 | Merge |
| F | Templates | 🟡 Medium | High | 6.5 | Extensive Testing |
| G | CC Effects | 🟡 M-H | High | 8-9 | Deep Testing + Opt-In |

**Estimated Total Effort**: 30-32 hours (development + testing)

---

## Part 4: Quality Assurance Checklist

### Before Each Merge

- [ ] All new code is feature-flagged or opt-in
- [ ] No changes to existing critical paths (v7.1.1 behavior preserved)
- [ ] Settings have sensible defaults (OFF for risky features)
- [ ] Console is free of errors (warnings OK if non-blocking)
- [ ] Performance impact measured and acceptable
- [ ] Fallbacks work (degradation tested)
- [ ] Cache auto-clears if needed
- [ ] Async operations have timeouts

### Before "Release Ready"

- [ ] Phases A-E are merged and stable
- [ ] Phase F (Templates) is working but marked "experimental"
- [ ] Phase G (CC Effects) is working but marked "beta"
- [ ] Documentation updated with new settings
- [ ] Users warned about new features being restored
- [ ] Feedback channel open for issues

---

## Part 5: Goals Alignment

### Original Project Goals (from project_overview.txt)

| Goal | Status | Implementation |
|------|--------|-----------------|
| 1. Reincorporate ideas from original | ✅ Incremental | Phases A-G restore systematically |
| 2. Provide distinctive animation selection | ✅ Partial | Phases B-F improve heuristics |
| 3. Map wide range of spells to JB2A | ✅ Improved | Curated spells + enhanced keywords |
| 4. Avoid bugs & runtime errors | ✅ Core | Feature flags + error handling throughout |
| 5. Maintain high-quality runtime experience | ✅ Design | Concurrency + caching + graceful degradation |

### How This Plan Addresses the Diagnosis

| Diagnosis | Response |
|-----------|----------|
| "Risk of reintroducing original bugs" | Feature-flag each restoration; extensive testing gates; graceful degradation |
| "Complex multi-system architecture was unstable" | Restore one system at a time; isolate dependencies; test each in isolation |
| "AI simplified by cutting features" | Deliberately re-add with human oversight; incremental approach allows stopping if issues arise |
| "Async operations caused timing issues" | All async operations have timeouts; Promise-based hooks; cleanup guaranteed |
| "Asset verification is now brittle" | Extend with fallback chains; keep existing verification intact; never remove safeguards |

---

## Implementation Roadmap (High-Level Timeline)

```
Week 1:
  Mon-Wed: Phase A (Curated Spells) + Phase B (Keywords)
  Thu-Fri: Phase C (Variants) + Phase D (Concurrency)

Week 2:
  Mon-Tue: Phase E (Caching) - final touches
  Wed-Thu: Phase F (Templates) - careful implementation
  Fri: Extensive testing of F

Week 3:
  Mon-Wed: Phase G (CC Effects) - most careful implementation
  Thu-Fri: Full integration testing, documentation

Week 4:
  Mon-Fri: Bugfixes, optimization, community testing
```

---

## Risk Mitigation Strategy

**If issues arise during any phase:**

1. **Immediate**: Disable via setting (all features are opt-in)
2. **Short-term**: File issue, gather logs, identify root cause
3. **Medium-term**: Implement fix or revert that phase
4. **Long-term**: Document the issue and why it occurred

**Decision Point After Phase E**:
- Pause and gather feedback
- If v7.1.1 + A-E stable: call it done and iterate on F-G based on demand
- If issues emerged: fix them before proceeding

---

## Success Criteria

This plan is successful when:

1. ✅ All Phase A-E features are merged and stable
2. ✅ Phase F (Templates) works without hanging or timing issues
3. ✅ Phase G (CC Effects) properly cleans up after itself
4. ✅ User can disable any feature via settings
5. ✅ Performance is equivalent to or better than v4.8
6. ✅ No cascading failures (graceful degradation throughout)
7. ✅ Console is clean (no spurious errors)
8. ✅ Achieves 80%+ of v4.8 capability
9. ✅ v7.1.1 users see immediate benefit from Phase A
10. ✅ Advanced users can opt into Phases F-G for richer experience

---

## Next Steps

1. **Review this plan** with the team
2. **Begin Phase A** (Curated Spells) — lowest risk, highest immediate impact
3. **Establish testing cadence** — daily builds, weekly gameplay tests
4. **Set up feedback channel** — collect user experiences early
5. **Create branch protection rules** — ensure quality gates before merge
