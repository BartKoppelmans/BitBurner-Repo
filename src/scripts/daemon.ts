import type { BitBurner as NS } from "Bitburner"
import { ServerManager } from "/src/managers/ServerManager";

export async function main(ns: NS) {

    const hostName: string = ns.getHostname();
    if (hostName !== "home") {
        throw Error("Execute daemon script from home.")
    }

    const serverManager: ServerManager = ServerManager.getInstance(ns);

}
