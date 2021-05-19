import type { BitBurner as NS } from "Bitburner"
import ExternalServer from "./ExternalServer.js";
import HomeServer from "./HomeServer.js";
import Server, { TreeStructure } from './Server.js'

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