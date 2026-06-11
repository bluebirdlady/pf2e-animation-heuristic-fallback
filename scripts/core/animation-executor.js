// ============================================================
// CORE: Sequencer playback pipeline and the chat-message intercept
// hook. Depends on settings.js and core/spell-parser.js.
// ============================================================

// NEW (Phase D): Tracks how many heuristic animation sequences are currently
// in flight, so a flurry of casts can't pile up unbounded Sequencer work.
let activeSequences = 0;

// ============================================================
// 5. RENDERING PIPELINE WITH VERIFICATION LOGGING
// ============================================================
// NEW (Phase K4): Accepts an optional pre-built animationConfig, used by
// core/strike-handler.js to bypass parseSpellToAnimation() (which is
// spell-shaped) for weapon-strike configs resolved via
// resolveStrikeAnimationAsset(). When omitted, behavior is unchanged.
async function executeHeuristicAnimation(spell, token, precomputedConfig = null) {
    if (!token || !canvas.tokens?.placeables.includes(token)) return;

    const SequenceClass = typeof Sequence !== 'undefined' ? Sequence : game.modules.get("sequencer")?.api?.Sequence;
    if (!SequenceClass) return;

    const animationConfig = precomputedConfig || parseSpellToAnimation(spell);

    // NEW (Phase A): Step aside for spells with a curated macro
    if (animationConfig.type === "CURATED_SPELL") {
        console.log(
            `%cPF2E HEURISTIC | Curated macro exists for "${animationConfig.originalSpellName}" (slug: ${animationConfig.spellSlug}) - skipping heuristic animation.`,
            "color: #99ff99; font-weight: bold;"
        );
        return;
    }

    // NEW (Phase D): Concurrency protection - if too many sequences are
    // already in flight, skip this one rather than piling on more canvas work.
    const maxConcurrent = getSettingSafe("maxConcurrentAnimations") || 4;
    if (activeSequences >= maxConcurrent) {
        console.debug(`PF2e Heuristic | Max concurrent animations (${maxConcurrent}) reached - skipping animation for "${spell.name}".`);
        return;
    }

    const targets = Array.from(game.user.targets).filter(t => t && canvas.tokens?.placeables.includes(t));

    // NEW (Phase F): For burst/area spells, optionally wait for the player to
    // place a measured template and center the animation on it. Opt-in,
    // times out after 5s, and falls back to target/self positioning if no
    // template is placed (or the spell has no area).
    let areaTemplate = null;
    if (getSettingSafe("useTemplateHandling") && ["burst", "cone", "line"].includes(animationConfig.type) && spell.system?.area?.type) {
        console.debug(`PF2e Heuristic | Awaiting template placement for "${spell.name}"...`);
        areaTemplate = await listenForTemplatePlacement(5000);
    }

    let seq = new SequenceClass();

    // NEW (Phase D): Bracket the entire sequence-building/playback lifecycle
    // so the in-flight counter is always decremented, even on error.
    activeSequences++;
    try {

    // PRINT ALL CHOSEN TAGS BEFORE SENDING TO SEQUENCER
    console.log(
        `%cPF2E HEURISTIC | TARGET DATABASE TAGS SELECTED:\n` +
        `%c  • Cast Ring:    "${animationConfig.castRing}"\n` +
        `%c  • Projectile:  "${animationConfig.projectile}"\n` +
        `%c  • Impact:      "${animationConfig.impact}"\n` +
        `%c  • Ground Ring: "${animationConfig.groundRing}"\n` +
        `%c  • Token Buff:  "${animationConfig.tokenBuff}"`,
        "color: #ffaa00; font-weight: bold; font-size: 11px;",
        animationConfig.castRing ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.projectile ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.impact ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.groundRing ? "color: #00ff66;" : "color: #ff3333;",
        animationConfig.tokenBuff ? "color: #00ff66;" : "color: #ff3333;"
    );

    // NEW (Part 1.1, extended Phase B): Log classification info if present
    if (animationConfig.traditionCircle || animationConfig.schoolOverlay || animationConfig.detectedConditions?.length) {
        console.log(
            `%cPF2E HEURISTIC | ENHANCED CLASSIFICATION:\n` +
            `%c  • Tradition: ${animationConfig.traditionKey || "none"}\n` +
            `%c  • School: ${animationConfig.schoolKey || "none"}\n` +
            `%c  • Conditions: ${animationConfig.detectedConditions?.length ? animationConfig.detectedConditions.join(", ") : "none"}`,
            "color: #99ff99; font-weight: bold;",
            animationConfig.traditionCircle ? "color: #00ff99;" : "color: #666666;",
            animationConfig.schoolOverlay ? "color: #00ff99;" : "color: #666666;",
            animationConfig.detectedConditions?.length ? "color: #00ff99;" : "color: #666666;"
        );
    }

    // PHASE 1: Casting Origin Elements
    if (animationConfig.castRing) {
        console.log(`%c[DEPLOYING] Cast Ring -> .file(${animationConfig.castRingVariants ? `[${animationConfig.castRingVariants.length} variants]` : `"${animationConfig.castRing}"`})`, "color: #00ccff;");
        seq.effect()
            .file(animationConfig.castRingVariants || animationConfig.castRing)
            .atLocation(token)
            .size(token.document.width * 2, { gridUnits: true })
            .fadeIn(200)
            .fadeOut(500)
            .waitUntilFinished(-300);
    }

    // PHASE 2: Tactical Routing Traversal (Projectiles)
    if (animationConfig.type === "projectile" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.projectile) {
                console.log(`%c[DEPLOYING] Projectile -> .file(${animationConfig.projectileVariants ? `[${animationConfig.projectileVariants.length} variants]` : `"${animationConfig.projectile}"`}) to target: ${target.name}`, "color: #00ccff;");
                let effectElement = seq.effect()
                    .file(animationConfig.projectileVariants || animationConfig.projectile)
                    .atLocation(token)
                    .stretchTo(target)
                    .missed(false)
                    .name(`projectile_${spell.slug}_${target.id}`);

                if (animationConfig.blend) effectElement.blendMode("ADD");
            }

            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(200);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }

            if (getSettingSafe("lingeringEffects") && animationConfig.groundRing) {
                console.log(`%c[DEPLOYING] Lingering Ring -> .file(${animationConfig.groundRingVariants ? `[${animationConfig.groundRingVariants.length} variants]` : `"${animationConfig.groundRing}"`}) on target: ${target.name}`, "color: #00ccff;");
                seq.effect()
                    .file(animationConfig.groundRingVariants || animationConfig.groundRing)
                    .atLocation(target)
                    .size(target.document.width * 1.2, { gridUnits: true })
                    .duration(2500)
                    .fadeIn(400)
                    .fadeOut(600);
            }
        }
    }
    // NEW (Phase H): Cone Pipeline - element-specific breath-weapon cone,
    // rotated toward a placed template or the first target if available.
    else if (animationConfig.type === "cone" && animationConfig.areaEffect) {
        const coneTarget = areaTemplate || (targets.length > 0 ? targets[0] : null);

        console.log(`%c[DEPLOYING] Cone -> .file("${animationConfig.areaEffect}")`, "color: #00ccff;");
        let coneElement = seq.effect()
            .file(animationConfig.areaEffect)
            .atLocation(token);

        if (coneTarget) coneElement.rotateTowards(coneTarget);
        if (animationConfig.blend) coneElement.blendMode("ADD");

        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Cone Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(400);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // NEW (Phase H): Line Pipeline - element-specific breath-weapon line,
    // stretched from the caster to a placed template or the first target.
    else if (animationConfig.type === "line" && animationConfig.areaEffect) {
        const lineTarget = areaTemplate || (targets.length > 0 ? targets[0] : null);

        console.log(`%c[DEPLOYING] Line -> .file("${animationConfig.areaEffect}")`, "color: #00ccff;");
        let lineElement = seq.effect()
            .file(animationConfig.areaEffect)
            .atLocation(token);

        if (lineTarget) lineElement.stretchTo(lineTarget);
        if (animationConfig.blend) lineElement.blendMode("ADD");

        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Line Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true })
                    .delay(400);

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // PHASE 3: Melee / Touch Pipeline (RESTORED)
    else if (animationConfig.type === "melee" && targets.length > 0) {
        for (const target of targets) {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Melee Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(target)
                    .size(target.document.width * 1.5, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    }
    // PHASE 4: Burst / Emanation / Splash Pipeline (DYNAMIC CENTER FIXED)
    else if (animationConfig.type === "burst") {
        // NEW (Phase F): Prefer a player-placed template's position, falling
        // back to the original target/self centering when none is available.
        const burstCenter = areaTemplate || (targets.length > 0 ? targets[0] : token);

        if (areaTemplate) {
            console.log(`%c[PHASE F] Centering burst on placed template at (${areaTemplate.position?.x}, ${areaTemplate.position?.y})`, "color: #00ccff;");
        }

        if (animationConfig.groundRing) {
            console.log(`%c[DEPLOYING] Burst Ground Ring -> .file(${animationConfig.groundRingVariants ? `[${animationConfig.groundRingVariants.length} variants]` : `"${animationConfig.groundRing}"`})`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.groundRingVariants || animationConfig.groundRing)
                .atLocation(burstCenter)
                .size(4, { gridUnits: true })
                .duration(3000)
                .fadeIn(300)
                .fadeOut(800);
        }

        if (targets.length > 0) {
            for (const target of targets) {
                if (animationConfig.impact) {
                    console.log(`%c[DEPLOYING] Burst Impact -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`}) on target: ${target.name}`, "color: #00ccff;");
                    let impactElement = seq.effect()
                        .file(animationConfig.impactVariants || animationConfig.impact)
                        .atLocation(target)
                        .size(target.document.width * 1.5, { gridUnits: true });

                    if (animationConfig.blend) impactElement.blendMode("ADD");
                }
            }
        } else {
            if (animationConfig.impact) {
                console.log(`%c[DEPLOYING] Burst Impact (Self Fallback) -> .file(${animationConfig.impactVariants ? `[${animationConfig.impactVariants.length} variants]` : `"${animationConfig.impact}"`})`, "color: #00ccff;");
                let impactElement = seq.effect()
                    .file(animationConfig.impactVariants || animationConfig.impact)
                    .atLocation(burstCenter)
                    .size(3, { gridUnits: true });

                if (animationConfig.blend) impactElement.blendMode("ADD");
            }
        }
    } 
    // PHASE 5: Utility / Personal Buff Route
    else {
        if (animationConfig.tokenBuff) {
            console.log(`%c[DEPLOYING] Token Buff -> .file(${animationConfig.tokenBuffVariants ? `[${animationConfig.tokenBuffVariants.length} variants]` : `"${animationConfig.tokenBuff}"`})`, "color: #00ccff;");
            seq.effect()
                .file(animationConfig.tokenBuffVariants || animationConfig.tokenBuff)
                .atLocation(token)
                .size(token.document.width * 1.2, { gridUnits: true })
                .duration(4000)
                .fadeIn(500)
                .fadeOut(500)
                .attachTo(token);
        }
    }

    console.log(`%c[SEQUENCER] Handing pipeline off to canvas execution engine.`, "color: #9900ff; font-weight: bold;");
    await seq.play();
    } finally {
        activeSequences--;
    }
}

// ============================================================
// 6. CHAT INTERCEPT HOOK
// ============================================================
Hooks.off("createChatMessage", globalThis._pf2eHeuristicHookId);

globalThis._pf2eHeuristicHookId = Hooks.on("createChatMessage", (message, options, userId) => {
    if (userId !== game.user.id) return;
    if (!getSettingSafe("enable")) return;

    ASSET_CACHE.clear();

    setTimeout(async () => {
        let spellName = "";
        
        if (message.flavor) {
            spellName = message.flavor;
        } else if (message.content) {
            const doc = new DOMParser().parseFromString(message.content, 'text/html');
            const header = doc.querySelector('.chat-card h3, h3, .item-name, .action strong');
            if (header) {
                spellName = header.textContent.trim();
            } else {
                spellName = doc.body.textContent.split('\n')[0].trim();
            }
        }

        if (spellName) spellName = spellName.replace(/\s+\d+$/, "");
        if (!spellName || spellName.length > 50) return;
        const lowerName = spellName.toLowerCase();
        
        if (lowerName.includes("strike") || lowerName.includes("attack") || lowerName.includes("saving throw")) return;

        const token = message.actor?.getActiveTokens()[0] || canvas.tokens.controlled[0];
        if (!token) return;

        const mockSpell = {
            name: spellName,
            slug: spellName.slugify({camel: false}),
            system: {
                description: { value: message.content || "" },
                traits: { value: [] }
            }
        };

        console.log(`%cPF2E HEURISTIC %c| Instantiating Canvas Sequence for: "${spellName}"`, "color: #00ffcc; font-weight: bold;", "color: #ffffff;");
        executeHeuristicAnimation(mockSpell, token);
    }, 200);
});
