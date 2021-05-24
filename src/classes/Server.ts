import type { BitBurner as NS } from "Bitburner";
import { Program } from "/src/classes/Program.js";
import { CONSTANT } from "/src/lib/constants.js";
import { ProgramManager } from "/src/managers/ProgramManager.js";

export interface TreeStructure {
    connections?: Server[];
    children?: Server[];
    parent?: Server;
}

export default class Server {
    // Static values
    host: string;
    treeStructure?: TreeStructure;


    public constructor(host: string, treeStructure?: TreeStructure) {
        this.host = host;

        if (treeStructure)
            this.updateTree(treeStructure);
    }

    public isHome() {
        return false;
    }

    public static isPurchasedServer(host: string) {
        return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
    }

    public static isDarkweb(host: string) {
        return (host === CONSTANT.DARKWEB_HOST);
    }

    public updateTree(treeStructure: TreeStructure) {

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

    public getAvailableRam(ns: NS) {
        let [total, used] = ns.getServerRam(this.host);
        return total - used;
    }

    public isRooted(ns: NS) {
        return ns.hasRootAccess(this.host);
    }
}