export var Heuristics;
(function (Heuristics) {
    Heuristics.MainHeuristic = function (ns, server) {
        return 0;
    };
    function evaluate(ns, server) {
        if (!server.securityLevel) {
            throw new Error(`Unable to evaluate ${server.host}`);
        }
        // TODO: Get rid of magic numbers
        return server.maxMoney * (100 / (server.minSecurityLevel + server.securityLevel));
    }
    Heuristics.evaluate = evaluate;
})(Heuristics || (Heuristics = {}));
