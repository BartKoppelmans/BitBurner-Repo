import type { BitBurner as NS } from "Bitburner";

export function startPurchasedServerManager(ns: NS): void {
    ns.exec('/src/managers/PurchasedServerManager.js', ns.getHostname());
}

export function isPurchasedServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/PurchasedServerManager.js', ns.getHostname());
}