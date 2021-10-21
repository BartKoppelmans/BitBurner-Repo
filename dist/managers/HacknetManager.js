import * as LogAPI from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { getPlayer } from '/src/util/PlayerUtils.js';
import { HacknetServer, } from '/src/classes/Server/HacknetServer.js';
import { HacknetServerUpgradeType, } from '/src/classes/Misc/HacknetServerInterfaces.js';
import { ServerPurpose, ServerType, } from '/src/classes/Server/ServerInterfaces.js';
const LOOP_DELAY = 30000;
const HACKNET_ALLOWANCE = 0.05;
const PAYOFF_TIME = 600; // Should pay off within 10 minutes
class HacknetManager {
    managingLoopTimeout;
    static getServerOptimalGainRateTotal(ns, servers, player) {
        return servers.reduce((total, server) => total + this.calculateServerOptimalGainRate(ns, server.nodeInformation, player), 0);
    }
    static calculateServerOptimalGainRate(ns, nodeInformation, player) {
        return ns.formulas.hacknetServers.hashGainRate(nodeInformation.level, 0, nodeInformation.ram, nodeInformation.cores, player.hacknet_node_money_mult);
    }
    static calculateUpgradeCost(ns, server, type, player, levels = 1) {
        switch (type) {
            case HacknetServerUpgradeType.LEVEL:
                return ns.formulas.hacknetServers.levelUpgradeCost(server.nodeInformation.level, levels, player.hacknet_node_level_cost_mult);
            case HacknetServerUpgradeType.RAM:
                return ns.formulas.hacknetServers.ramUpgradeCost(server.nodeInformation.ram, levels, player.hacknet_node_ram_cost_mult);
            case HacknetServerUpgradeType.CORES:
                return ns.formulas.hacknetServers.coreUpgradeCost(server.nodeInformation.cores, levels, player.hacknet_node_core_cost_mult);
            case HacknetServerUpgradeType.CACHE:
                return ns.formulas.hacknetServers.cacheUpgradeCost(server.nodeInformation.cache, levels);
            default:
                throw new Error('Not recognized the upgrade type ');
        }
    }
    static calculateUpgradedServerOptimalGainRateDelta(ns, server, type, player) {
        const nodeInformation = Object.assign({}, server.nodeInformation);
        const oldGainRate = this.calculateServerOptimalGainRate(ns, nodeInformation, player);
        const newGainRate = this.calculateUpgradedServerOptimalGainRate(ns, server, type, player);
        return newGainRate - oldGainRate;
    }
    static calculateUpgradedServerOptimalGainRate(ns, server, type, player) {
        const nodeInformation = Object.assign({}, server.nodeInformation);
        switch (type) {
            case HacknetServerUpgradeType.LEVEL:
                if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxLevel) {
                    return 0;
                }
                nodeInformation.level += 1;
                break;
            case HacknetServerUpgradeType.RAM:
                if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxRam) {
                    return 0;
                }
                nodeInformation.ram *= 2;
                break;
            case HacknetServerUpgradeType.CORES:
                if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxCores) {
                    return 0;
                }
                nodeInformation.cores += 1;
                break;
            default:
                throw new Error('The upgrade type does not affect the hash gain rate.');
        }
        return this.calculateServerOptimalGainRate(ns, nodeInformation, player);
    }
    static calculateHashCapacityDelta(ns, server) {
        if (server.nodeInformation.cache === ns.formulas.hacknetServers.constants().MaxCache)
            return 0;
        const oldHashCapacity = server.nodeInformation.hashCapacity;
        return oldHashCapacity - this.calculateHashCapacity(ns, server.nodeInformation.cache + 1);
    }
    static calculateHashCapacity(ns, cache) {
        return 32 * Math.pow(2, cache);
    }
    static calculateNewServerCost(ns, servers, player) {
        if (servers.length < ns.formulas.hacknetServers.constants().MaxServers) {
            return ns.formulas.hacknetServers.hacknetServerCost(servers.length + 1, player.hacknet_node_purchase_cost_mult);
        }
        else
            return Infinity;
    }
    static getNewServer(ns) {
        const hacknetServerId = ns.hacknet.numNodes() + 1;
        return new HacknetServer(ns, {
            nodeInformation: {
                level: 1,
                ram: 1,
                cores: 1,
                cache: 1,
                hashCapacity: 64,
            },
            purpose: ServerPurpose.NONE,
            characteristics: {
                hacknetServerId,
                id: Utils.generateHash(),
                type: ServerType.HacknetServer,
                host: `${CONSTANT.HACKNET_SERVER_PREFIX}${hacknetServerId}`,
                treeStructure: {
                    connections: [CONSTANT.HOME_SERVER_ID],
                    children: [],
                    parent: CONSTANT.HOME_SERVER_ID,
                },
            },
        });
    }
    static calculateNewServerGainRate(ns, player) {
        const nodeInformation = {
            level: 1,
            ram: 1,
            cores: 1,
            cache: 1,
            hashCapacity: this.calculateHashCapacity(ns, 1),
        };
        return this.calculateServerOptimalGainRate(ns, nodeInformation, player);
    }
    static calculateHashUpgrade(ns, server, type, player) {
        return {
            server,
            type,
            hashDelta: this.calculateUpgradedServerOptimalGainRateDelta(ns, server, type, player),
            cost: this.calculateUpgradeCost(ns, server, type, player),
            levels: 1,
        };
    }
    static canAfford(ns, upgrade, budget) {
        return upgrade.cost < budget;
    }
    static getBudget(ns) {
        return PlayerUtils.getMoney(ns) * HACKNET_ALLOWANCE;
    }
    static mergeUpgrades(ns, upgrades) {
        const mergedUpgrades = [];
        upgrades.forEach((upgrade) => {
            if (upgrade.type === HacknetServerUpgradeType.NEW) {
                mergedUpgrades.push(upgrade);
                return;
            }
            const index = mergedUpgrades.findIndex((u) => {
                if (u.type === HacknetServerUpgradeType.NEW)
                    return false;
                upgrade = upgrade;
                u = u;
                return u.server.characteristics.host === upgrade.server.characteristics.host && u.type === upgrade.type;
            });
            if (index === -1)
                mergedUpgrades.push(upgrade);
            else {
                mergedUpgrades[index].levels += 1;
            }
        });
        return mergedUpgrades;
    }
    static generatePotentialUpgrades(ns, hypotheticalServers, player) {
        const potentialUpgrades = [];
        for (const server of hypotheticalServers) {
            const levelUpgrade = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.LEVEL, player);
            const ramUpgrade = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.RAM, player);
            const coresUpgrade = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.CORES, player);
            const cacheUpgrade = {
                server,
                type: HacknetServerUpgradeType.CACHE,
                cacheDelta: HacknetManager.calculateHashCapacityDelta(ns, server),
                cost: HacknetManager.calculateUpgradeCost(ns, server, HacknetServerUpgradeType.CACHE, player),
                levels: 1,
            };
            potentialUpgrades.push(levelUpgrade, ramUpgrade, coresUpgrade, cacheUpgrade);
        }
        const newServerUpgrade = {
            type: HacknetServerUpgradeType.NEW,
            cost: HacknetManager.calculateNewServerCost(ns, hypotheticalServers, player),
            hashDelta: HacknetManager.calculateNewServerGainRate(ns, player),
        };
        potentialUpgrades.push(newServerUpgrade);
        return potentialUpgrades;
    }
    static isWorthIt(ns, upgrade, payoffTime) {
        return this.hashesToMoney(ns, upgrade.hashDelta) * payoffTime >= upgrade.cost;
    }
    static async executeUpgrade(ns, upgrade) {
        let isSuccessful;
        switch (upgrade.type) {
            case HacknetServerUpgradeType.NEW:
                const hacknetServerId = ns.hacknet.purchaseNode();
                if (hacknetServerId === -1)
                    throw new Error('We didn\'t manage to buy a new hacknet server.');
                const characteristics = {
                    hacknetServerId,
                    id: Utils.generateHash(),
                    type: ServerType.HacknetServer,
                    host: `${CONSTANT.HACKNET_SERVER_PREFIX}${hacknetServerId}`,
                    treeStructure: {
                        connections: [CONSTANT.HOME_SERVER_ID],
                        children: [],
                        parent: CONSTANT.HOME_SERVER_ID,
                    },
                };
                const server = new HacknetServer(ns, { characteristics });
                await ServerAPI.addServer(ns, server);
                LogAPI.printLog(ns, `Purchased hacknet server ${CONSTANT.HACKNET_SERVER_PREFIX}${hacknetServerId} for ${ns.nFormat(upgrade.cost, '$0.000a')}.`);
                break;
            case HacknetServerUpgradeType.RAM:
                isSuccessful = ns.hacknet.upgradeRam(upgrade.server.characteristics.hacknetServerId, upgrade.levels);
                if (!isSuccessful)
                    throw new Error('We didn\'t manage to upgrade the ram.');
                LogAPI.printLog(ns, `Upgraded ram of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`);
                break;
            case HacknetServerUpgradeType.CORES:
                isSuccessful = ns.hacknet.upgradeCore(upgrade.server.characteristics.hacknetServerId, upgrade.levels);
                if (!isSuccessful)
                    throw new Error('We didn\'t manage to upgrade the cores.');
                LogAPI.printLog(ns, `Upgraded cores of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`);
                break;
            case HacknetServerUpgradeType.LEVEL:
                isSuccessful = ns.hacknet.upgradeLevel(upgrade.server.characteristics.hacknetServerId, upgrade.levels);
                if (!isSuccessful)
                    throw new Error('We didn\'t manage to upgrade the levels.');
                LogAPI.printLog(ns, `Upgraded levels of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`);
                break;
            case HacknetServerUpgradeType.CACHE:
                isSuccessful = ns.hacknet.upgradeCache(upgrade.server.characteristics.hacknetServerId, upgrade.levels);
                if (!isSuccessful)
                    throw new Error('We didn\'t manage to upgrade the cache.');
                LogAPI.printLog(ns, `Upgraded cache of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`);
                break;
            default:
                throw new Error('Upgrade type not recognized.');
        }
    }
    static hashesToMoney(ns, hashes) {
        return 1e6 * hashes / 4;
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the HacknetManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.printTerminal(ns, `Stopping the HacknetManager`);
    }
    async managingLoop(ns) {
        const hacknetServers = ServerAPI.getHacknetServers(ns);
        const player = getPlayer(ns);
        let budget = HacknetManager.getBudget(ns);
        const oldGainRate = HacknetManager.getServerOptimalGainRateTotal(ns, hacknetServers, player);
        const hypotheticalServers = [...hacknetServers];
        const upgrades = [];
        while (true) {
            const potentialUpgrades = HacknetManager.generatePotentialUpgrades(ns, hypotheticalServers, player)
                .filter((upgrade) => HacknetManager.canAfford(ns, upgrade, budget));
            // TODO: Consider filtering out the upgrades that have a too long payoff time?
            // Stop if there are no potential upgrades
            if (potentialUpgrades.length === 0)
                break;
            const cacheUpgrade = this.findCacheUpgrade(potentialUpgrades);
            if (cacheUpgrade) {
                budget -= cacheUpgrade.cost;
                upgrades.push(cacheUpgrade);
                continue;
            }
            const hashUpgrade = this.findHashUpgrade(ns, potentialUpgrades, hypotheticalServers);
            if (hashUpgrade) {
                budget -= hashUpgrade.cost;
                upgrades.push(hashUpgrade);
            }
            else
                break; // No upgrades worth it
        }
        const mergedUpgrades = HacknetManager.mergeUpgrades(ns, upgrades);
        for (const upgrade of mergedUpgrades) {
            await HacknetManager.executeUpgrade(ns, upgrade);
        }
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    findHashUpgrade(ns, potentialUpgrades, hypotheticalServers) {
        const hashUpgrades = potentialUpgrades.filter((upgrade) => {
            return upgrade.type === HacknetServerUpgradeType.LEVEL ||
                upgrade.type === HacknetServerUpgradeType.CORES ||
                upgrade.type === HacknetServerUpgradeType.RAM ||
                upgrade.type === HacknetServerUpgradeType.NEW;
        });
        hashUpgrades.sort((a, b) => b.hashDelta - a.hashDelta);
        const hashUpgrade = hashUpgrades[0];
        if (hashUpgrade.type !== HacknetServerUpgradeType.NEW) {
            const worthIt = HacknetManager.isWorthIt(ns, hashUpgrade, PAYOFF_TIME);
            if (!worthIt)
                return null;
        }
        switch (hashUpgrade.type) {
            case HacknetServerUpgradeType.NEW:
                const hypotheticalServer = HacknetManager.getNewServer(ns);
                hypotheticalServers.push(hypotheticalServer);
                break;
            case HacknetServerUpgradeType.LEVEL:
                hashUpgrade.server.nodeInformation.level += 1;
                break;
            case HacknetServerUpgradeType.RAM:
                hashUpgrade.server.nodeInformation.ram *= 2;
                break;
            case HacknetServerUpgradeType.CORES:
                hashUpgrade.server.nodeInformation.cores += 1;
                break;
            default:
                throw new Error('Unexpected upgrade type');
        }
        return hashUpgrade;
    }
    findCacheUpgrade(potentialUpgrades) {
        // Always do cache upgrades, as they will help with hacking as well
        const cacheUpgrades = potentialUpgrades.filter((upgrade) => upgrade.type === HacknetServerUpgradeType.CACHE)
            .sort((a, b) => b.cacheDelta - a.cacheDelta);
        if (cacheUpgrades.length > 0) {
            const cacheUpgrade = cacheUpgrades[0];
            // TODO: Check whether this actually upgrades the server value!!!
            cacheUpgrade.server.nodeInformation.cache += 1;
            return cacheUpgrade;
        }
        else
            return null;
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new HacknetManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
