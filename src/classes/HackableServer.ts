import type { BitBurner as NS } from "Bitburner";
import ExternalServer from "/src/classes/ExternalServer.js";
import { Program } from "/src/classes/Program";
import { TreeStructure } from '/src/classes/Server.js';
import { PlayerManager } from "/src/managers/PlayerManager";
import { ProgramManager } from "/src/managers/ProgramManager";
import { Heuristics } from "/src/util/Heuristics";

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

    public canRoot(ns: NS) {
        return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= this.ports;
    }

    public async root(ns: NS): Promise<void> {
        if (this.isRooted(ns)) {
            throw new Error("Server is already rooted.");
        }

        if (!this.canRoot(ns)) {
            throw new Error("Cannot crack the server.");
        }

        const crackingScripts: Program[] = ProgramManager.getInstance(ns).getCrackingScripts(ns, this.ports);

        crackingScripts.forEach(program => program.run(ns, this));

        ns.nuke(this.host);
    }
}