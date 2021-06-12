export function startPurchasedServerManager(ns) {
    ns.exec('/src/managers/PurchasedServerManager.js', ns.getHostname());
}
export function isPurchasedServerManagerRunning(ns) {
    return ns.isRunning('/src/managers/PurchasedServerManager.js', ns.getHostname());
}
