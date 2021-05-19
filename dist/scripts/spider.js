import { ServerManager } from "../managers/ServerManager";
export async function main(ns) {
    let serverManager = new ServerManager(ns);
    serverManager.printServerMap(ns);
}
