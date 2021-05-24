export class PurchasedServerManager {
    constructor(ns) {
    }
    static getInstance(ns) {
        if (!PurchasedServerManager.instance) {
            PurchasedServerManager.instance = new PurchasedServerManager(ns);
        }
        return PurchasedServerManager.instance;
    }
}
