import type { BitBurner as NS } from "Bitburner"
import Server from '../classes/Server'
import HackableServer from '../classes/HackableServer'
import PurchasedServer from '../classes/PurchasedServer'
import { ServerManager } from "../managers/ServerManager"

export async function main(ns: NS) {
    let serverManager: ServerManager = new ServerManager(ns);
    serverManager.printServerMap(ns);
}
