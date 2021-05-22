import { ServerManager } from "/src/managers/ServerManager.js";
export async function main(ns) {
    let serverManager = ServerManager.getInstance(ns);
    serverManager.printServerMap(ns);
}
