import { serverManager } from "/src/managers/ServerManager.js";
export async function main(ns) {
    serverManager.printServerMap(ns);
}
