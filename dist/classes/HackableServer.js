import Server from '/src/classes/Server.js';
import PlayerManager from "/src/managers/PlayerManager.js";
export default class HackableServer extends Server {
    constructor(ns, host, treeStructure) {
        super(ns, host, treeStructure);
        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }
    getStaticHackingProperties(ns) {
        return {
            ports: ns.getServerNumPortsRequired(this.host),
            hackingLevel: ns.getServerRequiredHackingLevel(this.host),
            maxMoney: ns.getServerMaxMoney(this.host),
            growth: ns.getServerGrowth(this.host),
            minSecurityLevel: ns.getServerMinSecurityLevel(this.host),
            baseSecurityLevel: ns.getServerBaseSecurityLevel(this.host),
        };
    }
    updateDynamicHackingProperties(ns, forceUpdate = false) {
        if (!forceUpdate) {
            // TODO: Check if we need to update, otherwise return;
        }
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }
    getDynamicHackingProperties(ns) {
        return {
            lastUpdated: new Date(),
            securityLevel: ns.getServerSecurityLevel(this.host),
            money: ns.getServerMoneyAvailable(this.host),
            availableRam: this.getAvailableRam(ns),
            weakenTime: ns.getWeakenTime(this.host),
            growTime: ns.getGrowTime(this.host),
            hackTime: ns.getHackTime(this.host),
        };
    }
    // Setter for server Value
    async evaluate(ns, heuristic) {
        this.updateDynamicHackingProperties(ns, true);
        return this.serverValue = heuristic(ns, this);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.host) <= PlayerManager.getInstance(ns).hackingLevel;
    }
}
