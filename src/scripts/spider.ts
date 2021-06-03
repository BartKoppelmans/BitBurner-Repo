import type { BitBurner as NS } from "Bitburner";
import { serverManager } from "/src/managers/ServerManager.js";

export async function main(ns: NS) {
    serverManager.printServerMap(ns);
}
