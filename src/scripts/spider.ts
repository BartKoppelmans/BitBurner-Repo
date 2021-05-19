import type { BitBurner as NS } from "Bitburner"
import { ServerManager } from "../managers/ServerManager.js"

export async function main(ns: NS) {
    let serverManager: ServerManager = new ServerManager(ns);
    serverManager.printServerMap(ns);
}
