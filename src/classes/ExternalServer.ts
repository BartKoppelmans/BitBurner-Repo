import type { BitBurner as NS } from "Bitburner";
import { Program } from "/src/classes/Program.js";
import Server, { TreeStructure } from "/src/classes/Server.js";
import { ProgramManager } from "/src/managers/ProgramManager.js";

export default class ExternalServer extends Server {
    // Static values
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
    minSecurityLevel: number;
    baseSecurityLevel: number;
    ram: number;
    files: string[];

    public constructor(ns: NS, host: string, treeStructure?: TreeStructure) {
        super(host, treeStructure);

        this.ports = ns.getServerNumPortsRequired(host);
        this.hackingLevel = ns.getServerRequiredHackingLevel(host);
        this.maxMoney = ns.getServerMaxMoney(host);
        this.growth = ns.getServerGrowth(host);
        this.minSecurityLevel = ns.getServerMinSecurityLevel(host);
        this.baseSecurityLevel = ns.getServerBaseSecurityLevel(host);
        this.ram = ns.getServerRam(host)[0];
        this.files = ns.ls(host);
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