import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";

export default class PurchasedServer extends Server {

    constructor(ns: NS, id: number, host: string) {
        super(ns, id, host, {
            connections: [],
            children: [],
            parent: CONSTANT.HOME_SERVER_ID
        });
    }
}