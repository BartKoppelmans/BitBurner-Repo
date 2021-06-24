import { ServerPurpose } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import PlayerManager from "/src/managers/PlayerManager.js";
export function computeMaxRamPossible(ns, reservedMoney) {
    const canPurchase = canAfford(ns, Math.pow(2, CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM, reservedMoney);
    if (!canPurchase)
        return -1;
    // We want to start at 8 gigabytes, cause otherwise it's not worth it
    let exponent = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;
    for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {
        const cost = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
        // Stop if we can't afford a next upgrade
        if (!canAfford(ns, cost, reservedMoney)) {
            break;
        }
    }
    return Math.pow(2, exponent);
}
export function canAfford(ns, cost, reservedMoney) {
    const playerManager = PlayerManager.getInstance(ns);
    const money = (playerManager.getMoney(ns) - reservedMoney) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
    return cost <= money;
}
export async function shouldUpgrade(ns, purpose) {
    const serverMap = (purpose === ServerPurpose.HACK) ? await ServerAPI.getHackingServers(ns) : await ServerAPI.getPreppingServers(ns);
    const utilized = serverMap.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0);
    const total = serverMap.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0);
    return ((utilized / total) > CONSTANT.PURCHASED_SERVER_UPGRADE_UTILIZATION_THRESHOLD);
}
