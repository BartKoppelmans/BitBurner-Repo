export var Heuristics;
(function (Heuristics) {
    // TODO: These do not seem to work properly?
    Heuristics.MainHeuristic = function (ns, target) {
        return target.staticHackingProperties.maxMoney * (100 / (target.staticHackingProperties.minSecurityLevel + target.getSecurityLevel(ns)));
    };
    Heuristics.DiscordHeuristic = function (ns, target) {
        return target.staticHackingProperties.maxMoney * target.staticHackingProperties.growth / target.staticHackingProperties.minSecurityLevel / (target.staticHackingProperties.hackingLevel + 50);
    };
})(Heuristics || (Heuristics = {}));
