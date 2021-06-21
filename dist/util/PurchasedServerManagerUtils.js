import * as HackUtils from "/src/util/HackUtils.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
export function computeMaxRamPossible(ns) {
    const canPurchase = canAfford(ns, Math.pow(2, CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM);
    if (!canPurchase)
        return -1;
    // We want to start at 8 gigabytes, cause otherwise it's not worth it
    let exponent = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;
    for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {
        const cost = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
        // Stop if we can't afford a next upgrade
        if (!canAfford(ns, cost)) {
            break;
        }
    }
    return Math.pow(2, exponent);
}
export function canAfford(ns, cost) {
    const playerManager = PlayerManager.getInstance(ns);
    const money = playerManager.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
    return cost <= money;
}
export async function shouldUpgrade(ns) {
    const utilization = await HackUtils.determineUtilization(ns);
    return (utilization > CONSTANT.SERVER_UTILIZATION_THRESHOLD);
}
export function clusterServers(servers) {
    const map = new Map();
    servers.forEach((server) => {
        const key = server.ram;
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [server]);
        }
        else {
            collection.push(server);
        }
    });
    // TODO: Sort the map?
    return map;
}
