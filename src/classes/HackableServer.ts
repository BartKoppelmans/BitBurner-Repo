import type { BitBurner as NS } from "Bitburner";
import { Program } from "/src/classes/Program.js";
import Server, { TreeStructure } from '/src/classes/Server.js';
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { ProgramManager } from "/src/managers/ProgramManager.js";
import { Heuristics } from "/src/util/Heuristics.js";

export interface StaticHackingProperties {
    minSecurityLevel: number;
    baseSecurityLevel: number;
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
}

export interface DynamicHackingProperties {

    lastUpdated: Date;

    securityLevel: number;
    money: number;
    availableRam: number;

    weakenTime: number;
    growTime: number;
    hackTime: number;
}

export default class HackableServer extends Server {

    staticHackingProperties: StaticHackingProperties;
    dynamicHackingProperties: DynamicHackingProperties;

    serverValue?: Heuristics.HeuristicValue;

    constructor(ns: NS, host: string, treeStructure?: TreeStructure) {
        super(ns, host, treeStructure);

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
        return ns.getServerRequiredHackingLevel(this.host) <= PlayerManager.getInstance(ns).hackingLevel;
    }

    public canRoot(ns: NS) {
        return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= this.staticHackingProperties.ports;
    }

    public async root(ns: NS): Promise<void> {
        if (this.isRooted(ns)) {
            throw new Error("Server is already rooted.");
        }

        if (!this.canRoot(ns)) {
            throw new Error("Cannot crack the server.");
        }

        const crackingScripts: Program[] = ProgramManager.getInstance(ns).getCrackingScripts(ns, this.staticHackingProperties.ports);

        crackingScripts.forEach(program => program.run(ns, this));

        ns.nuke(this.host);
    }
}