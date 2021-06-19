import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { DynamicHackingProperties, ServerType, StaticHackingProperties, TreeStructure } from "/src/interfaces/ServerInterfaces.js";
import { Heuristics } from "/src/util/Heuristics.js";

export default class HackableServer extends Server {

    type: ServerType = ServerType.HackableServer;

    staticHackingProperties: StaticHackingProperties;
    dynamicHackingProperties: DynamicHackingProperties;

    serverValue?: Heuristics.HeuristicValue;

    constructor(ns: NS, id: number, host: string, treeStructure?: TreeStructure) {
        super(ns, id, host, treeStructure);

        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }

    private getStaticHackingProperties(ns: NS): StaticHackingProperties {
        return {
            ports: ns.getServerNumPortsRequired(this.host),
            hackingLevel: ns.getServerRequiredHackingLevel(this.host),
            maxMoney: ns.getServerMaxMoney(this.host),
            growth: ns.getServerGrowth(this.host),
            minSecurityLevel: ns.getServerMinSecurityLevel(this.host),
            baseSecurityLevel: ns.getServerBaseSecurityLevel(this.host),
        };
    }

    public updateDynamicHackingProperties(ns: NS, forceUpdate: boolean = false): void {
        if (!forceUpdate) {
            // TODO: Check if we need to update, otherwise return;
        }
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }

    private getDynamicHackingProperties(ns: NS): DynamicHackingProperties {
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
    async evaluate(ns: NS, heuristic: Heuristics.Heuristic): Promise<Heuristics.HeuristicValue> {
        this.updateDynamicHackingProperties(ns, true);
        return this.serverValue = heuristic(ns, this);
    }

    public isHackable(ns: NS) {
        return ns.getServerRequiredHackingLevel(this.host) <= ns.getHackingLevel();
    }
}