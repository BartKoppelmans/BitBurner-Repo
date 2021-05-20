import type { BitBurner as NS } from "Bitburner"
import ExternalServer from "/src/classes/ExternalServer.js";
import HomeServer from "/src/classes/HomeServer.js";
import Server, { TreeStructure } from '/src/classes/Server.js'

export default class PurchasedServer extends ExternalServer {

    treeStructure: TreeStructure = {
        connections: [HomeServer.getInstance()],
        children: [],
        parent: HomeServer.getInstance()
    }

    constructor(ns: NS, host: string) {
        super(ns, host);
    }
}