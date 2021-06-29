import Server from '/src/classes/Server.js';
import { ServerPurpose, ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
export default class HackableServer extends Server {
    constructor(ns, characteristics, treeStructure, purpose = ServerPurpose.NONE, status = ServerStatus.NONE) {
        super(ns, characteristics, treeStructure, purpose);
        this.status = ServerStatus.NONE;
        this.status = status;
        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.percentageToSteal = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL;
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
    getServer(ns) {
        return ns.getServer();
    }
    getSecurityLevel(ns) {
        return ns.getServerSecurityLevel(this.characteristics.host);
    }
    getMoney(ns) {
        return ns.getServerMoneyAvailable(this.characteristics.host);
    }
    getWeakenTime(ns) {
        return ns.getWeakenTime(this.characteristics.host);
    }
    getHackTime(ns) {
        return ns.getHackTime(this.characteristics.host);
    }
    getGrowTime(ns) {
        return ns.getGrowTime(this.characteristics.host);
    }
    // Setter for server Value
    async evaluate(ns, heuristic) {
        return this.serverValue = heuristic(ns, this);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel();
    }
    setStatus(status) {
        this.status = status;
    }
    isOptimal(ns) {
        return this.getSecurityLevel(ns) === this.staticHackingProperties.minSecurityLevel &&
            this.getMoney(ns) === this.staticHackingProperties.maxMoney;
    }
    needsGrow(ns) {
        return this.getMoney(ns) < this.staticHackingProperties.maxMoney;
    }
    needsWeaken(ns) {
        return this.getSecurityLevel(ns) > this.staticHackingProperties.minSecurityLevel;
    }
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            status: this.status
        };
    }
}
