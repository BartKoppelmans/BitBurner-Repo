import Server from '/src/classes/Server.js';
import { ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
export default class HackableServer extends Server {
    constructor(ns, id, host, treeStructure) {
        super(ns, id, host, treeStructure);
        this.type = ServerType.HackableServer;
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
        let percentageToSteal = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL;
        if (this.dynamicHackingProperties && this.dynamicHackingProperties.percentageToSteal) {
            percentageToSteal = this.dynamicHackingProperties.percentageToSteal;
        }
        return {
            lastUpdated: new Date(),
            securityLevel: ns.getServerSecurityLevel(this.host),
            money: ns.getServerMoneyAvailable(this.host),
            availableRam: this.getAvailableRam(ns),
            weakenTime: ns.getWeakenTime(this.host),
            growTime: ns.getGrowTime(this.host),
            hackTime: ns.getHackTime(this.host),
            percentageToSteal
        };
    }
    // Setter for server Value
    async evaluate(ns, heuristic) {
        this.updateDynamicHackingProperties(ns, true);
        return this.serverValue = heuristic(ns, this);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.host) <= ns.getHackingLevel();
    }
}
