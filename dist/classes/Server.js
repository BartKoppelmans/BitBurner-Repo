import serverConfig from '/src/config/server_config.js';
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
        return host.includes(serverConfig.purchasedServerPrefix);
    }
    updateTree(treeStructure) {
        if (!this.treeStructure && (treeStructure.connections || treeStructure.children || treeStructure.parent)) {
            this.treeStructure = {};
            if (treeStructure.connections)
                this.treeStructure.connections = treeStructure.connections;
            if (treeStructure.children)
                this.treeStructure.children = treeStructure.children;
            if (treeStructure.parent)
                this.treeStructure.parent = treeStructure.parent;
        }
    }
}
