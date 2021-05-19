import type { BitBurner as NS } from "Bitburner"
import serverConfig from '../config/server_config.js';

export interface TreeStructure {
    connections?: Server[];
    children?: Server[];
    parent?: Server;
}

export default class Server {
    // Static values
    host: string;
    treeStructure?: TreeStructure


    public constructor(host: string, treeStructure?: TreeStructure) {
        this.host = host;

        if (treeStructure)
            this.updateTree(treeStructure)
    }

    public isHome() {
        return false;
    }

    public static isPurchasedServer(host: string) {
        return host.includes(serverConfig.purchasedServerPrefix)
    }

    public updateTree(treeStructure: TreeStructure) {
        Object.assign(this.treeStructure, treeStructure);
    }
}