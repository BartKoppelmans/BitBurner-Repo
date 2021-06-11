import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { ServerType, TreeStructure } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";

export default class HomeServer extends Server {
    type: ServerType = ServerType.HomeServer;

    public constructor(ns: NS, treeStructure?: TreeStructure) {
        super(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST, treeStructure);
        this.ram = ns.getServerRam(this.host)[0] - CONSTANT.DESIRED_HOME_FREE_RAM;
    }

    // We want to make sure that we always have some RAM left.
    public getAvailableRam(ns: NS): number {
        const ram = super.getAvailableRam(ns);
        return Math.max(0, ram - CONSTANT.DESIRED_HOME_FREE_RAM);
    }
}