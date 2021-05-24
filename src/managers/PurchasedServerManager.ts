import type { BitBurner as NS } from "Bitburner";

export class PurchasedServerManager {
    private static instance: PurchasedServerManager;


    private constructor(ns: NS) {
    }

    public static getInstance(ns: NS): PurchasedServerManager {
        if (!PurchasedServerManager.instance) {
            PurchasedServerManager.instance = new PurchasedServerManager(ns);
        }

        return PurchasedServerManager.instance;
    }
}