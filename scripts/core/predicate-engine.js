// ============================================================
// CORE: Predicate evaluation (Phase K1). Generic evaluator for the PF2e
// Graphics predicate format (arrays of strings / {not|and|or|nor|gte|lte}
// statements), plus buildPredicateContext() which derives a fact/value
// context from a PF2e item and runtime options. Depends on settings.js
// (getSettingSafe) for the settings:* facts.
// ============================================================

// Evaluates a single predicate statement against a context of
// { facts: Set<string>, values: Record<string, number> }.
// Unknown string facts and unrecognized statement shapes evaluate to false
// (fail closed - a branch that can't be evaluated is treated as not matching).
function evaluatePredicateStatement(statement, context) {
    if (typeof statement === "string") {
        return context.facts.has(statement);
    }

    if (Array.isArray(statement)) {
        return statement.every(s => evaluatePredicateStatement(s, context));
    }

    if (statement && typeof statement === "object") {
        if ("not" in statement) return !evaluatePredicateStatement(statement.not, context);
        if ("and" in statement) return statement.and.every(s => evaluatePredicateStatement(s, context));
        if ("or" in statement) return statement.or.some(s => evaluatePredicateStatement(s, context));
        if ("nor" in statement) return !statement.nor.some(s => evaluatePredicateStatement(s, context));
        if ("gte" in statement) return getFactValue(statement.gte[0], context) >= statement.gte[1];
        if ("lte" in statement) return getFactValue(statement.lte[0], context) <= statement.lte[1];
    }

    return false;
}

// Numeric facts (e.g. "settings:quality", "condition:badge:value") live in
// context.values. Missing values evaluate as -Infinity, so gte comparisons
// against unknown facts are false and lte comparisons are true.
function getFactValue(fact, context) {
    if (Object.prototype.hasOwnProperty.call(context.values, fact)) {
        return context.values[fact];
    }
    return -Infinity;
}

// Top-level entry point. predicate may be undefined/null/empty (always
// matches), a single statement, or an array of statements (implicit AND).
// context may be a partially-formed object; missing facts/values default to
// empty so callers don't need to pre-fill everything.
function evaluatePredicate(predicate, context) {
    if (!predicate || (Array.isArray(predicate) && predicate.length === 0)) return true;

    const ctx = {
        facts: context?.facts || new Set(),
        values: context?.values || {}
    };

    return evaluatePredicateStatement(predicate, ctx);
}

// Builds a predicate context from a PF2e item document (and optional
// runtime/origin info). Covers the static-fact categories identified during
// Phase K scoping:
//   - item:trait:X / origin:item:trait:X
//   - melee / ranged / thrown
//   - action:cost:N
//   - jb2a:patreon / jb2a:free
//   - settings:quality / settings:persistent
// Runtime/outcome facts (check:outcome:*, condition:badge:value, toggle:*)
// are not derivable here and must be supplied via options.facts/options.values
// by the caller (e.g. a future attack-roll/saving-throw hook).
function buildPredicateContext(item, options = {}) {
    const facts = new Set();
    const values = {};

    const traits = (item?.system?.traits?.value || []).map(t => String(t).toLowerCase());
    for (const trait of traits) facts.add(`item:trait:${trait}`);

    const originTraits = (options.origin?.system?.traits?.value || []).map(t => String(t).toLowerCase());
    for (const trait of originTraits) facts.add(`origin:item:trait:${trait}`);

    if (traits.some(t => t === "thrown" || t.startsWith("thrown-"))) {
        facts.add("thrown");
        facts.add("item:thrown");
    }

    // melee/ranged: prefer an explicit override (e.g. which usage of a
    // thrown weapon triggered this), then fall back to the item's range.
    // Some older PF2e Graphics entries use "item:ranged"/"item:melee"
    // instead of the more common "ranged"/"melee" - set both forms so
    // either predicate style matches.
    let rangeKind = null;
    if (options.rangeKind === "melee" || options.rangeKind === "ranged") {
        rangeKind = options.rangeKind;
    } else if (item?.system?.range?.value) {
        rangeKind = "ranged";
    } else if (item?.type === "weapon" || item?.type === "melee" || item?.type === "action" || item?.type === "spell") {
        rangeKind = "melee";
    }
    if (rangeKind) {
        facts.add(rangeKind);
        facts.add(`item:${rangeKind}`);
    }

    const actionCost = options.actionCost ?? item?.system?.actions?.value;
    if (typeof actionCost === "number") facts.add(`action:cost:${actionCost}`);

    if (game.modules?.get("jb2a_patreon")?.active) {
        facts.add("jb2a:patreon");
    } else {
        facts.add("jb2a:free");
    }

    values["settings:quality"] = getSettingSafe("animationQualityLevel");
    if (getSettingSafe("usePersistentAnimations")) facts.add("settings:persistent");

    for (const fact of options.facts || []) facts.add(fact);
    Object.assign(values, options.values || {});

    return { facts, values };
}
