import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import PurchasedServer from "/src/classes/PurchasedServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";

export function computeMaxRamPossible(ns: NS, numServers: number = 1): number {

    // We want to start at 8 gigabytes, cause otherwise it's not worth it
    let exponent: number = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;

    for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {

        const cost: number = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
        const totalCost: number = cost * numServers;

        // Stop if we can't afford a next upgrade
        if (!canAfford(ns, totalCost)) {
            break;
        }
    }

    return Math.pow(2, exponent);
}

export function canAfford(ns: NS, cost: number): boolean {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);
    const money: number = playerManager.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;

    return cost <= money;
}

export async function shouldUpgrade(ns: NS): Promise<boolean> {
    const utilization: number = await determineUtilization(ns);
    return (utilization > CONSTANT.SERVER_UTILIZATION_THRESHOLD);
}

export async function determineUtilization(ns: NS): Promise<number> {
    const serverMap: Server[] = await ServerAPI.getHackingServers(ns);

    // The number of RAM used
    const utilized: number = serverMap.reduce((utilized, server) => utilized + Math.floor(ns.getServerRam(server.host)[1]), 0);
    const total: number = serverMap.reduce((subtotal, server) => subtotal + Math.ceil(ns.getServerRam(server.host)[0]), 0);

    return (utilized / total);
}

export function clusterServers(servers: PurchasedServer[]): Map<number, Server[]> {
    const map = new Map();
    servers.forEach((server) => {
        const key = server.ram;
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [server]);
        } else {
            collection.push(server);
        }
    });

    // TODO: Sort the map?

    return map;
}