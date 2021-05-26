import type { BitBurner as NS } from "Bitburner";
import ExternalServer from "/src/classes/ExternalServer.js";
import { TreeStructure } from '/src/classes/Server.js';
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { Heuristics } from "/src/util/Heuristics.js";

export default class HackableServer extends ExternalServer {
    securityLevel?: number;
    money?: number;
    availableRam?: number;

    weakenTime?: number;
    growTime?: number;
    hackTime?: number;

    serverValue?: Heuristics.HeuristicValue;

    constructor(ns: NS, host: string, treeStructure?: TreeStructure) {
        super(ns, host, treeStructure);
        this.updateDynamicProperties(ns);
    }

    public updateDynamicProperties(ns: NS) {
        this.securityLevel = ns.getServerSecurityLevel(this.host);
        this.money = ns.getServerMoneyAvailable(this.host);
        this.availableRam = this.ram - ns.getServerRam(this.host)[1];

        this.weakenTime = ns.getWeakenTime(this.host);
        this.growTime = ns.getGrowTime(this.host);
        this.hackTime = ns.getHackTime(this.host);
    }

    // Setter for server Value
    async evaluate(ns: NS, heuristic: Heuristics.Heuristic): Promise<Heuristics.HeuristicValue> {
        this.updateDynamicProperties(ns);
        return this.serverValue = heuristic(ns, this);
    }

    public isHackable(ns: NS) {
        return ns.getServerRequiredHackingLevel(this.host) <= PlayerManager.getInstance(ns).hackingLevel;
    }
}