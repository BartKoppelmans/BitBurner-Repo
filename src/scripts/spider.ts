import type { BitBurner as NS } from "Bitburner";
import ServerManager from "/src/managers/ServerManager.js";

export async function main(ns: NS) {
    let serverManager: ServerManager = ServerManager.getInstance(ns);
    serverManager.printServerMap(ns);
}
