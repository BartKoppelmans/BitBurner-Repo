import HomeServer from "/src/classes/HomeServer.js";
import Server from '/src/classes/Server.js';
export default class PurchasedServer extends Server {
    constructor(ns, host) {
        super(ns, host, {
            connections: [HomeServer.getInstance(ns)],
            children: [],
            parent: HomeServer.getInstance(ns)
        });
    }
}
