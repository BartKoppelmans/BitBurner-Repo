import serverConfig from '../config/server_config.json';
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
