import type { BitBurner as NS } from "Bitburner";
import PurchasedServer from "/src/classes/PurchasedServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import Utils from "/src/util/Utils.js";

export class PurchasedServerManager {
    private static instance: PurchasedServerManager;

    private purchasedServers: PurchasedServer[] = [];


    private purchaseLoopInterval?: ReturnType<typeof setInterval>;
    private upgradeLoopInterval?: ReturnType<typeof setInterval>;


    private constructor(ns: NS) {
        this.updateServerMap(ns);
    }

    public static getInstance(ns: NS): PurchasedServerManager {
        if (!PurchasedServerManager.instance) {
            PurchasedServerManager.instance = new PurchasedServerManager(ns);
        }

        return PurchasedServerManager.instance;
    }

    public async updateServerMap(ns: NS) {
        const serverManager: ServerManager = ServerManager.getInstance(ns);
        this.purchasedServers = await serverManager.getPurchasedServers(ns);
    }

    // Main entry point
    public async start(ns: NS) {

        this.updateServerMap(ns);

        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startPurchaseServerLoop(ns);
        } else {
            this.startUpgradeLoop(ns);
        }
    }

    // Purchasing new servers -------------------------------------------------------------------

    private async startPurchaseServerLoop(ns: NS) {
        this.purchaseServerLoop(ns);
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop, CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
    }


    // This tries to buy the highest number of servers at the same time, 
    // so that we can fill our servers up as quickly as possible
    private async purchaseServerLoop(ns: NS) {
        let updateNeeded: boolean = false;


        this.updateServerMap(ns);
        if (this.purchasedServers.length === CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startUpgradeLoop(ns);
            return;
        }

        const numServersLeft: number = CONSTANT.MAX_PURCHASED_SERVERS - this.purchasedServers.length;
        const ram: number = this.computeMaxRamPossible(ns, numServersLeft);


        for (let i = 0; i < numServersLeft; i++) {
            const id: number = CONSTANT.MAX_PURCHASED_SERVERS - numServersLeft + i;

            const isSuccessful: boolean = this.purchaseNewServer(ns, ram, id);
            if (!isSuccessful) {
                throw new Error("We could not successfully purchase the server");
            } else updateNeeded = true;
        }

        if (updateNeeded) {
            this.updateServerMap(ns);
            if (this.purchasedServers.length === CONSTANT.MAX_PURCHASED_SERVERS) {
                this.startUpgradeLoop(ns);
            }
        }
    }

    private purchaseNewServer(ns: NS, ram: number, id: number): boolean {
        const name: string = CONSTANT.PURCHASED_SERVER_PREFIX + id.toString();
        const boughtServer: string = ns.purchaseServer(name, ram);

        if (boughtServer) {
            Utils.tprintColored(`Purchased server ${boughtServer} with ${ram}GB ram.`);
        }

        return !!boughtServer;
    }

    // Upgrading existing servers ---------------------------------------------------------------

    private async startUpgradeLoop(ns: NS) {
        clearInterval(this.purchaseLoopInterval);
        this.upgradeLoop(ns);
        this.upgradeLoopInterval = setInterval(this.upgradeLoop, CONSTANT.UPGRADE_PURCHASED_SERVER_LOOP_INTERVAL);
    }

    private async upgradeLoop(ns: NS) {

        return;

        this.updateServerMap(ns);

        const serverManager: ServerManager = ServerManager.getInstance(ns);
        let updateNeeded: boolean = false;

        for (const server of this.purchasedServers) {

        }

        serverManager.rebuildServerMap(ns);
    }

    private async upgradeServer(ns: NS, server: PurchasedServer) {

    }


    // Util thingies -----------------------------------------------
    private computeMaxRamPossible(ns: NS, numServers: number): number {

        // We want to start at 8 gigabytes, cause otherwise it's not worth it
        let exponent: number = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1;

        for (exponent; exponent <= CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {

            const cost: number = Math.pow(2, exponent + 1) * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
            const totalCost: number = cost * numServers;

            // Stop if we can't afford a next upgrade
            if (!this.canAfford(ns, totalCost)) {
                break;
            }
        }

        return Math.pow(2, exponent);
    }

    private canAfford(ns: NS, cost: number): boolean {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);
        const money: number = playerManager.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;

        return cost <= money;;
    }
}