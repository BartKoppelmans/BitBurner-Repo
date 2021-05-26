import Server from "/src/classes/Server.js";
import { ProgramManager } from "/src/managers/ProgramManager";
export default class ExternalServer extends Server {
    constructor(ns, host, treeStructure) {
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
    canRoot(ns) {
        return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= this.ports;
    }
    async root(ns) {
        if (this.isRooted(ns)) {
            throw new Error("Server is already rooted.");
        }
        if (!this.canRoot(ns)) {
            throw new Error("Cannot crack the server.");
        }
        const crackingScripts = ProgramManager.getInstance(ns).getCrackingScripts(ns, this.ports);
        crackingScripts.forEach(program => program.run(ns, this));
        ns.nuke(this.host);
    }
}
