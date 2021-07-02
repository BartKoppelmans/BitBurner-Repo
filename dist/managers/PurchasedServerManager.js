import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as LogAPI from "/src/api/LogAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerPurpose } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as PurchasedServerManagerUtils from "/src/util/PurchasedServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";
class PurchasedServerManager {
    constructor() {
        this.purchasedServers = [];
        this.quarantinedServers = [];
    }
    async updateServerMap(ns) {
        await ServerAPI.requestUpdate(ns);
        this.purchasedServers = await ServerAPI.getPurchasedServers(ns);
        for (const server of this.purchasedServers) {
            const isQuarantined = this.quarantinedServers.some((quarantinedServer) => quarantinedServer.server.characteristics.host === server.characteristics.host);
            if (!isQuarantined && server.purpose === ServerPurpose.NONE) {
                const numberPattern = /\d+/g;
                const match = server.characteristics.host.match(numberPattern);
                if (!match)
                    throw new Error("Could not get the id of the purchased server");
                const id = parseInt(match[0]);
                const purpose = (id < CONSTANT.NUM_PURCHASED_HACKING_SERVERS) ? ServerPurpose.HACK : ServerPurpose.PREP;
                await ServerAPI.updatePurpose(ns, server, purpose);
            }
        }
    }
    // Main entry point
    async start(ns) {
        await LogAPI.log(ns, `Starting the PurchasedServerManager`, true, LogMessageCode.INFORMATION);
        await this.updateServerMap(ns);
        if (this.purchasedServers.length < CONSTANT.MAX_PURCHASED_SERVERS) {
            await this.startPurchaseServerLoop(ns);
        }
        else {
            await this.startUpgradeLoop(ns);
        }
    }
    async onDestroy(ns) {
        if (this.upgradeLoopInterval) {
            clearInterval(this.upgradeLoopInterval);
        }
        if (this.purchaseLoopInterval) {
            clearInterval(this.purchaseLoopInterval);
        }
        await LogAPI.log(ns, "Stopping the PurchasedServerManager", true, LogMessageCode.INFORMATION);
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
        const numServersLeft = CONSTANT.MAX_PURCHASED_SERVERS - this.purchasedServers.length;
        for (let i = 0; i < numServersLeft; i++) {
            const ram = PurchasedServerManagerUtils.computeMaxRamPossible(ns, this.getReservedMoney());
            if (ram === -1)
                break;
            const id = this.purchasedServers.length + i;
            const isSuccessful = await this.purchaseNewServer(ns, ram, id);
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
    async purchaseNewServer(ns, ram, id) {
        const name = CONSTANT.PURCHASED_SERVER_PREFIX + id.toString();
        const boughtServer = ns.purchaseServer(name, ram);
        if (boughtServer) {
            await LogAPI.log(ns, `Purchased server ${boughtServer} with ${ram}GB ram.`, true, LogMessageCode.PURCHASED_SERVER);
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
        let updateNeeded = false;
        let finishedQuarantines = [];
        for await (const quarantinedServer of this.quarantinedServers) {
            const processes = ns.ps(quarantinedServer.server.characteristics.host);
            if (processes.length !== 0)
                continue;
            const isSuccessful = await this.upgradeServer(ns, quarantinedServer.server, quarantinedServer.ram);
            updateNeeded = updateNeeded || isSuccessful;
            if (isSuccessful) {
                await ServerAPI.updatePurpose(ns, quarantinedServer.server, quarantinedServer.originalPurpose);
                finishedQuarantines.push(quarantinedServer);
                await LogAPI.log(ns, `We removed ${quarantinedServer.server.characteristics.host} from quarantine`, true, LogMessageCode.PURCHASED_SERVER);
            }
        }
        this.quarantinedServers = this.quarantinedServers.filter((q) => {
            return !finishedQuarantines.some((fq) => fq.server.characteristics.host === q.server.characteristics.host);
        });
        for (const server of this.purchasedServers) {
            const isQuarantined = this.quarantinedServers.some((quarantinedServer) => quarantinedServer.server.characteristics.host === server.characteristics.host);
            if (isQuarantined)
                continue;
            const shouldUpgrade = await PurchasedServerManagerUtils.shouldUpgrade(ns, server.purpose);
            if (!shouldUpgrade)
                continue;
            const maxRam = PurchasedServerManagerUtils.computeMaxRamPossible(ns, this.getReservedMoney());
            if (maxRam > server.getTotalRam(ns)) {
                await this.quarantineServer(ns, server, maxRam);
            }
            else
                break;
        }
        if (updateNeeded)
            await this.updateServerMap(ns);
    }
    async quarantineServer(ns, server, ram) {
        this.quarantinedServers.push({ originalPurpose: server.purpose, server, ram });
        // Quarantine the server
        await ServerAPI.updatePurpose(ns, server, ServerPurpose.NONE);
        // TODO: Subtract the costs from the money that we currently have, to also put some budget into quarantine
        await LogAPI.log(ns, `We put ${server.characteristics.host} into quarantine`, true, LogMessageCode.PURCHASED_SERVER);
    }
    async upgradeServer(ns, server, ram) {
        const hostName = server.characteristics.host;
        const deletedServer = ns.deleteServer(hostName);
        if (!deletedServer) {
            await LogAPI.log(ns, `Could not delete server ${hostName}`, true, LogMessageCode.WARNING);
            return false;
        }
        const boughtServer = ns.purchaseServer(hostName, ram);
        if (boughtServer) {
            await LogAPI.log(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`, true, LogMessageCode.PURCHASED_SERVER);
        }
        return !!boughtServer;
    }
    getReservedMoney() {
        return this.quarantinedServers.reduce((reservedMoney, quarantinedServer) => reservedMoney + (quarantinedServer.ram * CONSTANT.PURCHASED_SERVER_COST_PER_RAM), 0);
    }
}
export async function main(ns) {
    const instance = new PurchasedServerManager();
    Utils.disableLogging(ns);
    await instance.start(ns);
    // We just keep sleeping because we have to keep this script running
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
