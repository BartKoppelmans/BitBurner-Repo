import { ServerType } from "/src/interfaces/ServerInterfaces.js";
export default class Server {
    constructor(ns, id, host, treeStructure) {
        this.type = ServerType.BasicServer;
        this.id = id;
        this.host = host;
        this.ram = ns.getServerRam(this.host)[0];
        this.files = ns.ls(this.host);
        if (treeStructure)
            this.updateTree(treeStructure);
    }
    updateTree(treeStructure) {
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
        let [total, used] = ns.getServerRam(this.host);
        return total - used;
    }
    toJSON() {
        return {
            id: this.id,
            host: this.host,
            treeStructure: this.treeStructure,
            type: this.type
        };
    }
}
