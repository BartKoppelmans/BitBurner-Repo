import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

export async function startPurchasedServerManager(ns: NS): Promise<void> {
    if (isPurchasedServerManagerRunning(ns)) return;

    // TODO: Check whether there is enough ram available

    ns.exec('/src/managers/PurchasedServerManager.js', CONSTANT.HOME_SERVER_HOST);

    while (!isPurchasedServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isPurchasedServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/PurchasedServerManager.js', CONSTANT.HOME_SERVER_HOST);
}