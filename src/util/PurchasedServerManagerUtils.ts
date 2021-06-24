import type { BitBurner as NS } from "Bitburner";
import { ServerPurpose } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import PlayerManager from "/src/managers/PlayerManager.js";
import Server from "/src/classes/Server.js";

export function computeMaxRamPossible(ns: NS, reservedMoney: number): number {

    const canPurchase: boolean = canAfford(ns, Math.pow(2, CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM, reservedMoney);

    if (!canPurchase) return -1;

    // We want to start at 8 gigabytes, cause otherwise it's not worth it
    let exponent: number = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;

    for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {

        const cost: number = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;

        // Stop if we can't afford a next upgrade
        if (!canAfford(ns, cost, reservedMoney)) {
            break;
        }
    }

    return Math.pow(2, exponent);
}

export function canAfford(ns: NS, cost: number, reservedMoney: number): boolean {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);
    const money: number = (playerManager.getMoney(ns) - reservedMoney) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;

    return cost <= money;
}



export async function shouldUpgrade(ns: NS, purpose: ServerPurpose): Promise<boolean> {
    const serverMap: Server[] = (purpose === ServerPurpose.HACK) ? await ServerAPI.getHackingServers(ns) : await ServerAPI.getPreppingServers(ns);

    const utilized: number = serverMap.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0);
    const total: number = serverMap.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0);

    return ((utilized / total) > CONSTANT.PURCHASED_SERVER_UPGRADE_UTILIZATION_THRESHOLD);
}