import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import Utils from "/src/util/Utils.js";
export class PurchasedServerManager {
    constructor(ns) {
        this.purchasedServers = [];
        this.updateServerMap(ns);
    }
    static getInstance(ns) {
        if (!PurchasedServerManager.instance) {
            PurchasedServerManager.instance = new PurchasedServerManager(ns);
        }
        return PurchasedServerManager.instance;
    }
    async updateServerMap(ns) {
        const serverManager = ServerManager.getInstance(ns);
        this.purchasedServers = await serverManager.getPurchasedServers(ns);
    }
    // Main entry point
    async start(ns) {
        this.updateServerMap(ns);
        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startPurchaseServerLoop(ns);
        }
        else {
            this.startUpgradeLoop(ns);
        }
    }
    // Purchasing new servers -------------------------------------------------------------------
    async startPurchaseServerLoop(ns) {
        this.purchaseServerLoop(ns);
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop, CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
    }
    // This tries to buy the highest number of servers at the same time, 
    // so that we can fill our servers up as quickly as possible
    async purchaseServerLoop(ns) {
        let updateNeeded = false;
        this.updateServerMap(ns);
        if (this.purchasedServers.length === CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startUpgradeLoop(ns);
            return;
        }
        const numServersLeft = CONSTANT.MAX_PURCHASED_SERVERS - this.purchasedServers.length;
        const ram = this.computeMaxRamPossible(ns, numServersLeft);
        for (let i = 0; i < numServersLeft; i++) {
            const id = CONSTANT.MAX_PURCHASED_SERVERS - numServersLeft + i;
            const isSuccessful = this.purchaseNewServer(ns, ram, id);
            if (!isSuccessful) {
                throw new Error("We could not successfully purchase the server");
            }
            else
                updateNeeded = true;
        }
        if (updateNeeded) {
            this.updateServerMap(ns);
            if (this.purchasedServers.length === CONSTANT.MAX_PURCHASED_SERVERS) {
                this.startUpgradeLoop(ns);
            }
        }
    }
    purchaseNewServer(ns, ram, id) {
        const name = CONSTANT.PURCHASED_SERVER_PREFIX + id.toString();
        const boughtServer = ns.purchaseServer(name, ram);
        if (boughtServer) {
            Utils.tprintColored(`Purchased server ${boughtServer} with ${ram}GB ram.`);
        }
        return !!boughtServer;
    }
    // Upgrading existing servers ---------------------------------------------------------------
    async startUpgradeLoop(ns) {
        clearInterval(this.purchaseLoopInterval);
        this.upgradeLoop(ns);
        this.upgradeLoopInterval = setInterval(this.upgradeLoop, CONSTANT.UPGRADE_PURCHASED_SERVER_LOOP_INTERVAL);
    }
    async upgradeLoop(ns) {
        return;
        this.updateServerMap(ns);
        const serverManager = ServerManager.getInstance(ns);
        let updateNeeded = false;
        for (const server of this.purchasedServers) {
        }
        serverManager.rebuildServerMap(ns);
    }
    async upgradeServer(ns, server) {
    }
    // Util thingies -----------------------------------------------
    computeMaxRamPossible(ns, numServers) {
        // We want to start at 8 gigabytes, cause otherwise it's not worth it
        let exponent = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;
        for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {
            const cost = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
            const totalCost = cost * numServers;
            // Stop if we can't afford a next upgrade
            if (!this.canAfford(ns, totalCost)) {
                break;
            }
        }
        return Math.pow(2, exponent);
    }
    canAfford(ns, cost) {
        const playerManager = PlayerManager.getInstance(ns);
        const money = playerManager.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
        return cost <= money;
        ;
    }
}
