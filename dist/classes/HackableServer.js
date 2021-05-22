import ExternalServer from "/src/classes/ExternalServer.js";
import { ProgramManager } from "/src/managers/ProgramManager.js";
export default class HackableServer extends ExternalServer {
    constructor(ns, host, treeStructure) {
        super(ns, host, treeStructure);
    }
    hack(ns) {
    }
    weaken(ns) {
    }
    grow(ns) {
    }
    canRoot(ns) {
        return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= this.ports;
    }
    root(ns) {
        if (!this.canRoot(ns)) {
            throw Error("Cannot crack the server.");
        }
        const crackingScripts = ProgramManager.getInstance(ns).getCrackingScripts(ns, this.ports);
        crackingScripts.forEach(program => program.run(ns, this));
        ns.nuke(this.host);
    }
}
