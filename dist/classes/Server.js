export default class Server {
    constructor(ns, host, treeStructure) {
        this.host = host;
        this.ram = ns.getServerRam(host)[0];
        this.files = ns.ls(host);
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
    isRooted(ns) {
        return ns.hasRootAccess(this.host);
    }
    canRoot(ns) {
        return false;
    }
    async root(ns) {
        return;
    }
}
