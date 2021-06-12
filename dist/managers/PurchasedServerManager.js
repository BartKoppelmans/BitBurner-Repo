import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
import * as Utils from "/src/util/Utils.js";
export default class PurchasedServerManager {
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
        await ServerAPI.requestUpdate(ns);
        this.purchasedServers = await ServerAPI.getPurchasedServers(ns);
    }
    // Main entry point
    async start(ns) {
        Utils.tprintColored(`Starting the PurchasedServerManager`, true, CONSTANT.COLOR_INFORMATION);
        await this.updateServerMap(ns);
        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            this.startPurchaseServerLoop(ns);
        }
        else {
            this.startUpgradeLoop(ns);
        }
    }
    // Purchasing new servers -------------------------------------------------------------------
    async startPurchaseServerLoop(ns) {
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop.bind(this, ns), CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
        this.purchaseServerLoop(ns);
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
        if (!(await this.shouldUpgrade(ns)))
            return;
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
            Utils.tprintColored(`Purchased server ${boughtServer} with ${ram}GB ram.`, true, CONSTANT.COLOR_INFORMATION);
        }
        return !!boughtServer;
    }
    // Upgrading existing servers ---------------------------------------------------------------
    async startUpgradeLoop(ns) {
        if (this.purchaseLoopInterval) {
            clearInterval(this.purchaseLoopInterval);
        }
        this.upgradeLoopInterval = setInterval(this.upgradeLoop.bind(this, ns), CONSTANT.UPGRADE_PURCHASED_SERVER_LOOP_INTERVAL);
        this.upgradeLoop(ns);
    }
    async upgradeLoop(ns) {
        this.updateServerMap(ns);
        for (const server of this.purchasedServers) {
            if (!(await this.shouldUpgrade(ns)))
                break;
            const maxRam = this.computeMaxRamPossible(ns, 1);
            if (maxRam > server.ram) {
                const updateNeeded = await this.upgradeServer(ns, server, maxRam);
                if (updateNeeded)
                    this.updateServerMap(ns);
            }
            else
                break;
        }
    }
    async upgradeServer(ns, server, ram) {
        const hostName = server.host;
        // TODO: We should make sure that the server finishes scripts first
        // and is put into quarantine, so that no new scripts are started
        // For now we just kill everything and hope for the best
        ns.killall(hostName);
        await ns.sleep(CONSTANT.SMALL_DELAY);
        const deletedServer = ns.deleteServer(hostName);
        if (!deletedServer) {
            Utils.tprintColored(`Could not delete server ${hostName}`, true, CONSTANT.COLOR_WARNING);
            return false;
        }
        const boughtServer = ns.purchaseServer(hostName, ram);
        if (boughtServer) {
            Utils.tprintColored(`Upgraded server ${boughtServer} with ${ram}GB ram.`, true, CONSTANT.COLOR_INFORMATION);
        }
        return !!boughtServer;
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
    }
    async shouldUpgrade(ns) {
        const utilization = await this.determineUtilization(ns);
        return (utilization < CONSTANT.SERVER_UTILIZATION_THRESHOLD);
    }
    async determineUtilization(ns) {
        const serverMap = await ServerAPI.getHackingServers(ns);
        // The number of RAM used
        const available = serverMap.reduce((utilized, server) => utilized + Math.floor(ns.getServerRam(server.host)[1]), 0);
        const total = serverMap.reduce((utilized, server) => utilized + Math.ceil(ns.getServerRam(server.host)[0]), 0);
        return ((total - available) / total);
    }
}
