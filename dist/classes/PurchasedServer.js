import ExternalServer from "./ExternalServer.js";
import HomeServer from "./HomeServer.js";
export default class PurchasedServer extends ExternalServer {
    constructor(ns, host) {
        super(ns, host);
        this.treeStructure = {
            connections: [HomeServer.getInstance()],
            children: [],
            parent: HomeServer.getInstance()
        };
    }
}
