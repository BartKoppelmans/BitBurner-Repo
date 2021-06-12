import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import PurchasedServer from "/src/classes/PurchasedServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as PurchasedServerManagerUtils from "/src/util/PurchasedServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";

class PurchasedServerManager {

    private purchasedServers: PurchasedServer[] = [];

    private purchaseLoopInterval?: ReturnType<typeof setInterval>;
    private upgradeLoopInterval?: ReturnType<typeof setInterval>;

    public constructor(ns: NS) { }

    private async updateServerMap(ns: NS) {
        await ServerAPI.requestUpdate(ns);
        this.purchasedServers = await ServerAPI.getPurchasedServers(ns);
    }

    // Main entry point
    public async start(ns: NS) {
        Utils.tprintColored(`Starting the PurchasedServerManager`, true, CONSTANT.COLOR_INFORMATION);

        await this.updateServerMap(ns);

        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            await this.startPurchaseServerLoop(ns);
        } else {
            await this.startUpgradeLoop(ns);
        }
    }

    // Purchasing new servers -------------------------------------------------------------------

    private async startPurchaseServerLoop(ns: NS) {
        this.purchaseLoopInterval = setInterval(this.purchaseServerLoop.bind(this, ns), CONSTANT.PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL);
        await this.purchaseServerLoop(ns);
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

        if (!(await PurchasedServerManagerUtils.shouldUpgrade(ns))) return;

        const numServersLeft: number = CONSTANT.MAX_PURCHASED_SERVERS - this.purchasedServers.length;
        const ram: number = PurchasedServerManagerUtils.computeMaxRamPossible(ns, numServersLeft);


        for (let i = 0; i < numServersLeft; i++) {
            const id: number = CONSTANT.MAX_PURCHASED_SERVERS - numServersLeft + i;

            const isSuccessful: boolean = this.purchaseNewServer(ns, ram, id);
            if (!isSuccessful) {
                throw new Error("We could not successfully purchase the server");
            } else updateNeeded = true;
        }

        if (updateNeeded) {
            await this.updateServerMap(ns);
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
        await this.upgradeLoop(ns);
    }

    private async upgradeLoop(ns: NS) {
        await this.updateServerMap(ns);

        if (!(await PurchasedServerManagerUtils.shouldUpgrade(ns))) return;

        let updateNeeded: boolean = false;

        const clusters: Map<number, PurchasedServer[]> = PurchasedServerManagerUtils.clusterServers(this.purchasedServers);

        for await (const cluster of clusters) {
            const maxRam = PurchasedServerManagerUtils.computeMaxRamPossible(ns, cluster.length);

            for await (const server of this.purchasedServers) {
                if (maxRam > server.ram) {
                    const isSuccessful: boolean = await this.upgradeServer(ns, server, maxRam);
                    updateNeeded = updateNeeded || isSuccessful;
                } else break;
            }
        }

        if (updateNeeded) await this.updateServerMap(ns);
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

}

export async function main(ns: NS) {
    const instance: PurchasedServerManager = new PurchasedServerManager(ns);

    await instance.start(ns);

    // We just keep sleeping because we have to keep this script running
    while (true) {
        await ns.sleep(10 * 1000);
    }
}