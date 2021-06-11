export var Heuristics;
(function (Heuristics) {
    Heuristics.MainHeuristic = function (ns, server) {
        return 0;
    };
    function evaluate(ns, server) {
        if (!server.dynamicHackingProperties.securityLevel) {
            throw new Error(`Unable to evaluate ${server.host}`);
        }
        // TODO: Get rid of magic numbers
        // TODO: Filter anything that we can't actually attack...
        return server.staticHackingProperties.maxMoney * (100 / (server.staticHackingProperties.minSecurityLevel + server.dynamicHackingProperties.securityLevel));
    }
    Heuristics.evaluate = evaluate;
})(Heuristics || (Heuristics = {}));
