import type { BitBurner as NS } from "Bitburner";
import ExternalServer from "/src/classes/ExternalServer.js";
import { Program } from "/src/classes/Program";
import Server, { TreeStructure } from '/src/classes/Server.js';
import { ProgramManager } from "/src/managers/ProgramManager.js";

export default class HackableServer extends ExternalServer {

    constructor(ns: NS, host: string, treeStructure?: TreeStructure) {
        super(ns, host, treeStructure);
    }

    public hack(ns: NS) {

    }

    public weaken(ns: NS) {

    }

    public grow(ns: NS) {

    }

    public canRoot(ns: NS) {
        return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= this.ports;
    }

    public root(ns: NS) {
        if (!this.canRoot(ns)) {
            throw Error("Cannot crack the server.");
        }
        const crackingScripts: Program[] = ProgramManager.getInstance(ns).getCrackingScripts(ns, this.ports);

        crackingScripts.forEach(program => program.run(ns, this));

        ns.nuke(this.host);
    }
}