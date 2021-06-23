import Server from '/src/classes/Server.js';
import { ServerPurpose, ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
export default class HackableServer extends Server {
    constructor(ns, characteristics, treeStructure, purpose = ServerPurpose.NONE) {
        super(ns, characteristics, treeStructure, purpose);
        this.status = ServerStatus.NONE;
        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }
    getStaticHackingProperties(ns) {
        return {
            ports: ns.getServerNumPortsRequired(this.characteristics.host),
            hackingLevel: ns.getServerRequiredHackingLevel(this.characteristics.host),
            maxMoney: ns.getServerMaxMoney(this.characteristics.host),
            growth: ns.getServerGrowth(this.characteristics.host),
            minSecurityLevel: ns.getServerMinSecurityLevel(this.characteristics.host),
            baseSecurityLevel: ns.getServerBaseSecurityLevel(this.characteristics.host),
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
            securityLevel: ns.getServerSecurityLevel(this.characteristics.host),
            money: ns.getServerMoneyAvailable(this.characteristics.host),
            availableRam: this.getAvailableRam(ns),
            weakenTime: ns.getWeakenTime(this.characteristics.host),
            growTime: ns.getGrowTime(this.characteristics.host),
            hackTime: ns.getHackTime(this.characteristics.host),
            percentageToSteal
        };
    }
    // Setter for server Value
    async evaluate(ns, heuristic) {
        this.updateDynamicHackingProperties(ns, true);
        return this.serverValue = heuristic(ns, this);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel();
    }
    setStatus(status) {
        this.status = status;
    }
    isOptimal() {
        return this.dynamicHackingProperties.securityLevel === this.staticHackingProperties.minSecurityLevel &&
            this.dynamicHackingProperties.money === this.staticHackingProperties.maxMoney;
    }
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            status: this.status
        };
    }
}
