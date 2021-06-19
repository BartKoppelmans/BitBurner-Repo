import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

export async function startPurchasedServerManager(ns: NS): Promise<void> {
    if (isPurchasedServerManagerRunning(ns)) return;

    ns.exec('/src/managers/PurchasedServerManager.js', ns.getHostname());

    while (!isPurchasedServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isPurchasedServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/PurchasedServerManager.js', ns.getHostname());
}