import * as LogAPI from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { ServerPurpose, ServerType } from '/src/classes/Server/ServerInterfaces.js';
import * as Utils from '/src/util/Utils.js';
import { PurchasedServer } from '/src/classes/Server/PurchasedServer.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
const MIN_RAM_EXPONENT = 4;
const UTILIZATION_THRESHOLD = 0.8;
class PurchasedServerRunner {
    static getMaxRam(ns) {
        return ns.getPurchasedServerMaxRam();
    }
    static getMaxRamExponent(ns) {
        return this.ramToExponent(this.getMaxRam(ns));
    }
    static exponentToRam(exponent) {
        return Math.pow(2, exponent);
    }
    static ramToExponent(ram) {
        return Math.log2(ram);
    }
    static getCost(ns, ram) {
        // TODO: Update to facilitate new costs
        return ns.getPurchasedServerCost(ram);
    }
    static async purchaseNewServer(ns, ram, purchasedServerId) {
        const host = CONSTANT.PURCHASED_SERVER_PREFIX + purchasedServerId.toString();
        const boughtServer = ns.purchaseServer(host, ram);
        if (boughtServer === '')
            throw new Error('Could not purchase the server');
        LogAPI.printTerminal(ns, `Purchased server ${boughtServer} with ${ram}GB ram.`);
        const characteristics = {
            id: Utils.generateHash(),
            type: ServerType.PurchasedServer,
            host,
            purchasedServerId,
            treeStructure: PurchasedServer.getDefaultTreeStructure(),
        };
        const server = new PurchasedServer(ns, { characteristics });
        await ServerAPI.addServer(ns, server);
        return server;
    }
    static shouldUpgrade(ns, purpose) {
        const purchasedServers = ServerAPI.getPurchasedServers(ns);
        const utilization = ServerAPI.getServerUtilization(ns, purchasedServers, purpose);
        return (utilization > UTILIZATION_THRESHOLD);
    }
    async run(ns) {
        if (ns.getPurchasedServerLimit() === 0)
            return;
        const purchasedServerList = ServerAPI.getPurchasedServers(ns);
        if (purchasedServerList.length < ns.getPurchasedServerLimit()) {
            await this.purchaseServers(ns, purchasedServerList);
        }
        else {
            await this.upgradeServers(ns, purchasedServerList);
        }
    }
    async purchaseServers(ns, purchasedServerList) {
        const numServersLeft = ns.getPurchasedServerLimit() - purchasedServerList.length;
        for (let i = 0; i < numServersLeft; i++) {
            const ram = this.computeMaxRamPossible(ns);
            // We stop if we cannot purchase any more servers
            if (ram === -1)
                break;
            const id = purchasedServerList.length + i;
            const purchasedServer = await PurchasedServerRunner.purchaseNewServer(ns, ram, id);
            if (!purchasedServer) {
                throw new Error('We could not successfully purchase the server');
            }
        }
    }
    async upgradeServers(ns, purchasedServerList) {
        const quarantinedServers = purchasedServerList.filter((s) => s.isQuarantined());
        for (const server of quarantinedServers) {
            if (!server.quarantinedInformation.quarantined)
                continue;
            const ram = server.quarantinedInformation.ram;
            if (server.canUpgrade(ns, ram)) {
                await ServerAPI.upgradeServer(ns, server.characteristics.host, ram);
            }
        }
        const shouldUpgradePrep = PurchasedServerRunner.shouldUpgrade(ns, ServerPurpose.PREP);
        const shouldUpgradeHack = PurchasedServerRunner.shouldUpgrade(ns, ServerPurpose.HACK);
        if (!shouldUpgradeHack && !shouldUpgradePrep)
            return;
        for (const server of purchasedServerList) {
            if (server.isQuarantined())
                continue;
            if (server.purpose === ServerPurpose.HACK && !shouldUpgradeHack)
                continue;
            else if (server.purpose === ServerPurpose.PREP && !shouldUpgradePrep)
                continue;
            const maxRam = this.computeMaxRamPossible(ns);
            if (maxRam > server.getTotalRam(ns)) {
                await ServerAPI.quarantine(ns, server.characteristics.host, maxRam);
            }
            else
                break;
        }
    }
    computeMaxRamPossible(ns) {
        const canPurchase = this.canAfford(ns, PurchasedServerRunner.exponentToRam(MIN_RAM_EXPONENT));
        if (!canPurchase)
            return -1;
        // We want to start at 8 gigabytes, cause otherwise it's not worth it
        let exponent = MIN_RAM_EXPONENT - 1;
        for (exponent; exponent < PurchasedServerRunner.getMaxRamExponent(ns); exponent++) {
            // Stop if we can't afford a next upgrade
            const canAfford = this.canAfford(ns, Math.pow(2, exponent + 1));
            if (!canAfford)
                break;
        }
        return Math.min(PurchasedServerRunner.exponentToRam(exponent), ns.getPurchasedServerMaxRam());
    }
    canAfford(ns, ram) {
        const cost = PurchasedServerRunner.getCost(ns, ram);
        const reservedMoney = this.getReservedMoney(ns);
        const money = (PlayerUtils.getMoney(ns) - reservedMoney) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
        return cost <= money;
    }
    getReservedMoney(ns) {
        const purchasedServerList = ServerAPI.getPurchasedServers(ns);
        const quarantinedServerList = purchasedServerList.filter((s) => s.isQuarantined());
        return quarantinedServerList.reduce((reservedMoney, server) => {
            if (server.quarantinedInformation.quarantined) {
                return reservedMoney + PurchasedServerRunner.getCost(ns, server.quarantinedInformation.ram);
            }
            else
                return reservedMoney;
        }, 0);
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new PurchasedServerRunner()).run(ns);
}
