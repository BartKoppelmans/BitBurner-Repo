import ExternalServer from "/src/classes/ExternalServer.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
export default class HackableServer extends ExternalServer {
    constructor(ns, host, treeStructure) {
        super(ns, host, treeStructure);
        this.updateDynamicProperties(ns);
    }
    updateDynamicProperties(ns) {
        this.securityLevel = ns.getServerSecurityLevel(this.host);
        this.money = ns.getServerMoneyAvailable(this.host);
        this.availableRam = this.ram - ns.getServerRam(this.host)[1];
        this.weakenTime = ns.getWeakenTime(this.host);
        this.growTime = ns.getGrowTime(this.host);
        this.hackTime = ns.getHackTime(this.host);
    }
    // Setter for server Value
    async evaluate(ns, heuristic) {
        this.updateDynamicProperties(ns);
        return this.serverValue = heuristic(ns, this);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.host) <= PlayerManager.getInstance(ns).hackingLevel;
    }
}
