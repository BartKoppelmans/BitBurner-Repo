import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as PurchasedServerManagerUtils from "/src/util/PurchasedServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";
class PurchasedServerManager {
    constructor() {
        this.purchasedServers = [];
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
            await this.startPurchaseServerLoop(ns);
        }
        else {
            await this.startUpgradeLoop(ns);
        }
    }
    // Purchasing new servers -------------------------------------------------------------------
    async startPurchaseServerLoop(ns) {
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop.bind(this, ns), CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
        await this.purchaseServerLoop(ns);
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
        if (!(await PurchasedServerManagerUtils.shouldUpgrade(ns)))
            return;
        const numServersLeft = CONSTANT.MAX_PURCHASED_SERVERS - this.purchasedServers.length;
        const ram = PurchasedServerManagerUtils.computeMaxRamPossible(ns, numServersLeft);
        for (let i = 0; i < numServersLeft; i++) {
            const id = this.purchasedServers.length + i;
            const isSuccessful = this.purchaseNewServer(ns, ram, id);
            if (!isSuccessful) {
                throw new Error("We could not successfully purchase the server");
            }
            else
                updateNeeded = true;
        }
        if (updateNeeded) {
            await this.updateServerMap(ns);
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
        await this.upgradeLoop(ns);
    }
    async upgradeLoop(ns) {
        await this.updateServerMap(ns);
        const shouldUpgrade = await PurchasedServerManagerUtils.shouldUpgrade(ns);
        if (!shouldUpgrade)
            return;
        let updateNeeded = false;
        for await (const server of this.purchasedServers) {
            const maxRam = PurchasedServerManagerUtils.computeMaxRamPossible(ns);
            if (maxRam > server.ram) {
                const isSuccessful = await this.upgradeServer(ns, server, maxRam);
                updateNeeded = updateNeeded || isSuccessful;
            }
            else
                break;
        }
        if (updateNeeded)
            await this.updateServerMap(ns);
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
}
export async function main(ns) {
    const instance = new PurchasedServerManager();
    await instance.start(ns);
    // We just keep sleeping because we have to keep this script running
    while (true) {
        await ns.sleep(10 * 1000);
    }
}
