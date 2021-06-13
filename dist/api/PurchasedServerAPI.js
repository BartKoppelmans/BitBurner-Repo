import { CONSTANT } from "/src/lib/constants.js";
export async function startPurchasedServerManager(ns) {
    ns.exec('/src/managers/PurchasedServerManager.js', ns.getHostname());
    while (!isPurchasedServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isPurchasedServerManagerRunning(ns) {
    return ns.isRunning('/src/managers/PurchasedServerManager.js', ns.getHostname());
}
