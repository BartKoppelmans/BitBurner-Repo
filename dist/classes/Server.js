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
        Object.assign(this.treeStructure, treeStructure);
    }
}
