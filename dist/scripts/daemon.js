import { ServerManager } from "/src/managers/ServerManager";
export async function main(ns) {
    const hostName = ns.getHostname();
    if (hostName !== "home") {
        throw Error("Execute daemon script from home.");
    }
    const serverManager = ServerManager.getInstance(ns);
}
