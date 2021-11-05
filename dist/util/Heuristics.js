export let MainHeuristic = (ns, target) => {
    return target.staticHackingProperties.maxMoney * (100 / (target.staticHackingProperties.minSecurityLevel + target.getSecurityLevel(ns)));
};
export let DiscordHeuristic = (ns, target) => {
    return target.staticHackingProperties.maxMoney * target.staticHackingProperties.growth / target.staticHackingProperties.minSecurityLevel / (target.staticHackingProperties.hackingLevel + 50);
};
