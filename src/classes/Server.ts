import type { BitBurner as NS } from "Bitburner";
import { ServerCharacteristics, ServerPurpose, TreeStructure } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";

export default class Server {

    characteristics: ServerCharacteristics;

    purpose: ServerPurpose;

    treeStructure?: TreeStructure;
    files: string[];


    public constructor(ns: NS, characteristics: ServerCharacteristics, treeStructure?: TreeStructure, purpose: ServerPurpose = ServerPurpose.NONE) {
        this.characteristics = characteristics;
        this.purpose = purpose;

        this.files = ns.ls(this.characteristics.host);

        if (treeStructure) this.updateTreeStructure(treeStructure);
    }

    public updateTreeStructure(treeStructure: TreeStructure): void {
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
        let [total, used] = ns.getServerRam(this.characteristics.host);
        return total - used - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0);
    }

    public getTotalRam(ns: NS): number {
        return ns.getServerRam(this.characteristics.host)[0];
    }

    public getUsedRam(ns: NS): number {
        return ns.getServerRam(this.characteristics.host)[1];
    }

    public isRooted(ns: NS): boolean {
        return ns.hasRootAccess(this.characteristics.host);
    }

    public setPurpose(purpose: ServerPurpose): void {
        this.purpose = purpose;
    }

    public toJSON() {
        return {
            characteristics: this.characteristics,
            treeStructure: this.treeStructure,
            purpose: this.purpose
        };
    }
}