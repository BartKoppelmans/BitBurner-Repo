import type { BitBurner as NS } from "Bitburner";
import HomeServer from "/src/classes/HomeServer.js";
import Server from '/src/classes/Server.js';

export default class PurchasedServer extends Server {

    constructor(ns: NS, host: string) {
        super(ns, host, {
            connections: [HomeServer.getInstance(ns)],
            children: [],
            parent: HomeServer.getInstance(ns)
        });
    }
}