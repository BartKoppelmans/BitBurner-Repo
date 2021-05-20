import type { BitBurner as NS } from "Bitburner"
import serverConfig from '/src/config/server_config.js';

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

        if (!treeStructure.connections && !treeStructure.children && !treeStructure.parent) {
            return;
        }

        if (!this.treeStructure) {
            this.treeStructure = {}
        }

        if (treeStructure.connections)
            this.treeStructure.connections = treeStructure.connections;

        if (treeStructure.children)
            this.treeStructure.children = treeStructure.children;

        if (treeStructure.parent)
            this.treeStructure.parent = treeStructure.parent;
    }
}