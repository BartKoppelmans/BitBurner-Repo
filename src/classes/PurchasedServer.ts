import type { BitBurner as NS } from "Bitburner"
import ExternalServer from "./ExternalServer";
import HomeServer from "./HomeServer";
import Server, { TreeStructure } from './Server'

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