import type { BitBurner as NS } from "Bitburner";
import PurchasedServer from "/src/classes/PurchasedServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
import ServerManager from "/src/managers/ServerManager.js";
import * as Utils from "/src/util/Utils.js";

export default class PurchasedServerManager {
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
        serverManager.rebuildServerMap(ns);
        this.purchasedServers = await serverManager.getPurchasedServers(ns);
    }

    // Main entry point
    public async start(ns: NS) {

        Utils.tprintColored(`Starting the PurchasedServerManager`, true, CONSTANT.COLOR_INFORMATION);

        await this.updateServerMap(ns);

        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startPurchaseServerLoop(ns);
        } else {
            this.startUpgradeLoop(ns);
        }
    }

    // Purchasing new servers -------------------------------------------------------------------

    private async startPurchaseServerLoop(ns: NS) {
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop.bind(this, ns), CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
        this.purchaseServerLoop(ns);
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

        if (!(await this.shouldUpgrade(ns))) return;

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
            Utils.tprintColored(`Purchased server ${boughtServer} with ${ram}GB ram.`, true, CONSTANT.COLOR_INFORMATION);
        }

        return !!boughtServer;
    }

    // Upgrading existing servers ---------------------------------------------------------------

    private async startUpgradeLoop(ns: NS) {

        if (this.purchaseLoopInterval) {
            clearInterval(this.purchaseLoopInterval);
        }
        this.upgradeLoopInterval = setInterval(this.upgradeLoop.bind(this, ns), CONSTANT.UPGRADE_PURCHASED_SERVER_LOOP_INTERVAL);
        this.upgradeLoop(ns);
    }

    private async upgradeLoop(ns: NS) {
        this.updateServerMap(ns);

        for (const server of this.purchasedServers) {

            if (!(await this.shouldUpgrade(ns))) break;

            const maxRam = this.computeMaxRamPossible(ns, 1);
            if (maxRam > server.ram) {
                const updateNeeded = await this.upgradeServer(ns, server, maxRam);

                if (updateNeeded) this.updateServerMap(ns);
            } else break;
        }
    }

    private async upgradeServer(ns: NS, server: PurchasedServer, ram: number): Promise<boolean> {
        const hostName: string = server.host;

        // TODO: We should make sure that the server finishes scripts first
        // and is put into quarantine, so that no new scripts are started

        // For now we just kill everything and hope for the best

        ns.killall(hostName);

        await ns.sleep(CONSTANT.SMALL_DELAY);

        const deletedServer: boolean = ns.deleteServer(hostName);

        if (!deletedServer) {
            Utils.tprintColored(`Could not delete server ${hostName}`, true, CONSTANT.COLOR_WARNING);
            return false;
        }

        const boughtServer: string = ns.purchaseServer(hostName, ram);

        if (boughtServer) {
            Utils.tprintColored(`Upgraded server ${boughtServer} with ${ram}GB ram.`, true, CONSTANT.COLOR_INFORMATION);
        }

        return !!boughtServer;
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

        return cost <= money;
    }

    private async shouldUpgrade(ns: NS): Promise<boolean> {
        const utilization: number = await this.determineUtilization(ns);
        return (utilization < CONSTANT.SERVER_UTILIZATION_THRESHOLD);
    }

    private async determineUtilization(ns: NS): Promise<number> {
        const serverManager: ServerManager = ServerManager.getInstance(ns);
        const serverMap: Server[] = await serverManager.getHackingServers(ns);

        // The number of RAM used
        const available: number = serverMap.reduce((utilized, server) => utilized + Math.floor(ns.getServerRam(server.host)[1]), 0);
        const total: number = serverMap.reduce((utilized, server) => utilized + Math.ceil(ns.getServerRam(server.host)[0]), 0);

        return ((total - available) / total);
    }
}