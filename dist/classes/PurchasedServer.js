import ExternalServer from "./ExternalServer";
import HomeServer from "./HomeServer";
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
