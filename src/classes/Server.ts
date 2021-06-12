import type { BitBurner as NS } from "Bitburner";
import { ServerType, TreeStructure } from "/src/interfaces/ServerInterfaces.js";

export default class Server {

    type: ServerType = ServerType.BasicServer;

    // Static values
    id: number;
    host: string;
    treeStructure?: TreeStructure;

    ram: number;
    files: string[];


    public constructor(ns: NS, id: number, host: string, treeStructure?: TreeStructure) {
        this.id = id;
        this.host = host;

        this.ram = ns.getServerRam(this.host)[0];
        this.files = ns.ls(this.host);

        if (treeStructure)
            this.updateTree(treeStructure);
    }

    public updateTree(treeStructure: TreeStructure): void {
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

    public getAvailableRam(ns: NS): number {
        let [total, used] = ns.getServerRam(this.host);
        return total - used;
    }

    public isRooted(ns: NS): boolean {
        return ns.hasRootAccess(this.host);
    }

    public toJSON() {
        return {
            id: this.id,
            host: this.host,
            treeStructure: this.treeStructure,
            type: this.type
        };
    }
}