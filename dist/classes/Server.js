import { CONSTANT } from "/src/lib/constants.js";
export default class Server {
    constructor(host, treeStructure) {
        this.host = host;
        if (treeStructure)
            this.updateTree(treeStructure);
    }
    isHome() {
        return false;
    }
    static isPurchasedServer(host) {
        return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
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
}
