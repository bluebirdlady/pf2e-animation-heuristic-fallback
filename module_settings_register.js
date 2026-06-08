Hooks.once("init", () => {
    game.settings.register("pf2e-heuristic-fallback", "enable", {
        name: "Enable Heuristic Fallback Animations",
        hint: "Automatically evaluates and plays best-guess visual effects for spells missing explicit hand-crafted macros.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
});