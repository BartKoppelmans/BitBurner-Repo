import { ServerPurpose } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export default class Server {
    constructor(ns, characteristics, treeStructure, purpose = ServerPurpose.NONE) {
        this.characteristics = characteristics;
        this.purpose = purpose;
        this.files = ns.ls(this.characteristics.host);
        if (treeStructure)
            this.updateTreeStructure(treeStructure);
    }
    updateTreeStructure(treeStructure) {
        if (!treeStructure.connections && !treeStructure.children && !treeStructure.parent) {
            return;
        }
        if (!this.treeStructure) {
            this.treeStructure = {};
        }
        if (treeStructure.connections)
            this.treeStructure.connections = treeStructure.connections;
        if (treeStructure.children)
            this.treeStructure.children = treeStructure.children;
        if (treeStructure.parent)
            this.treeStructure.parent = treeStructure.parent;
    }
    getAvailableRam(ns) {
        let [total, used] = ns.getServerRam(this.characteristics.host);
        return total - used - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0);
    }
    getTotalRam(ns) {
        return ns.getServerRam(this.characteristics.host)[0];
    }
    getUsedRam(ns) {
        return ns.getServerRam(this.characteristics.host)[1];
    }
    isRooted(ns) {
        return ns.hasRootAccess(this.characteristics.host);
    }
    setPurpose(purpose) {
        this.purpose = purpose;
    }
    toJSON() {
        return {
            characteristics: this.characteristics,
            treeStructure: this.treeStructure,
            purpose: this.purpose
        };
    }
}
