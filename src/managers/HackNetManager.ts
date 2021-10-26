import type { BitBurner as NS, Player } from 'Bitburner'
import * as LogAPI                      from '/src/api/LogAPI.js'
import * as ServerAPI                   from '/src/api/ServerAPI.js'
import * as Utils                       from '/src/util/Utils.js'
import {
	Manager,
}                                       from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                     from '/src/lib/constants.js'
import * as PlayerUtils                 from '/src/util/PlayerUtils.js'
import { getPlayer }                    from '/src/util/PlayerUtils.js'
import {
	HacknetServer,
}                                       from '/src/classes/Server/HacknetServer.js'
import {
	HacknetServerAddition,
	HacknetServerCacheUpgrade,
	HacknetServerHashUpgrade,
	HacknetServerHashUpgradeType,
	HacknetServerUpgrade,
	HacknetServerUpgradeType,
}                                       from '/src/classes/Misc/HacknetServerInterfaces.js'
import {
	HacknetServerCharacteristics,
	NodeInformation,
	ServerPurpose,
	ServerType,
}                                       from '/src/classes/Server/ServerInterfaces.js'

const LOOP_DELAY: number        = 30000 as const
const HACKNET_ALLOWANCE: number = 0.05 as const
const PAYOFF_TIME: number       = 3600 as const // Should pay off within 10 minutes

class HacknetManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	private static getServerOptimalGainRateTotal(ns: NS, servers: HacknetServer[], player: Player): number {
		return servers.reduce((total, server) => total + this.calculateServerOptimalGainRate(ns, server.nodeInformation, player), 0)
	}

	private static calculateServerOptimalGainRate(ns: NS, nodeInformation: NodeInformation, player: Player): number {
		return ns.formulas.hacknetServers.hashGainRate(
			nodeInformation.level,
			0,
			nodeInformation.ram,
			nodeInformation.cores,
			player.hacknet_node_money_mult,
		)
	}

	private static calculateUpgradeCost(ns: NS, server: HacknetServer, type: HacknetServerUpgradeType, player: Player, levels: number = 1): number {
		switch (type) {
			case HacknetServerUpgradeType.LEVEL:
				return ns.formulas.hacknetServers.levelUpgradeCost(
					server.nodeInformation.level,
					levels,
					player.hacknet_node_level_cost_mult,
				)
			case HacknetServerUpgradeType.RAM:
				return ns.formulas.hacknetServers.ramUpgradeCost(
					server.nodeInformation.ram,
					levels,
					player.hacknet_node_ram_cost_mult,
				)
			case HacknetServerUpgradeType.CORES:
				return ns.formulas.hacknetServers.coreUpgradeCost(
					server.nodeInformation.cores,
					levels,
					player.hacknet_node_core_cost_mult,
				)
			case HacknetServerUpgradeType.CACHE:
				return ns.formulas.hacknetServers.cacheUpgradeCost(
					server.nodeInformation.cache,
					levels,
				)
			default:
				throw new Error('Not recognized the upgrade type ')
		}
	}

	private static calculateUpgradedServerOptimalGainRateDelta(ns: NS, server: HacknetServer, type: HacknetServerUpgradeType, player: Player): number {
		const nodeInformation: NodeInformation = Object.assign({}, server.nodeInformation)
		const oldGainRate: number              = this.calculateServerOptimalGainRate(ns, nodeInformation, player)
		const newGainRate: number              = this.calculateUpgradedServerOptimalGainRate(ns, server, type, player)
		return newGainRate - oldGainRate
	}

	private static calculateUpgradedServerOptimalGainRate(ns: NS, server: HacknetServer, type: HacknetServerUpgradeType, player: Player): number {
		const nodeInformation: NodeInformation = Object.assign({}, server.nodeInformation)
		switch (type) {
			case HacknetServerUpgradeType.LEVEL:
				if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxLevel) {
					return 0
				}
				nodeInformation.level += 1
				break
			case HacknetServerUpgradeType.RAM:
				if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxRam) {
					return 0
				}
				nodeInformation.ram *= 2
				break
			case HacknetServerUpgradeType.CORES:
				if (nodeInformation.level === ns.formulas.hacknetServers.constants().MaxCores) {
					return 0
				}
				nodeInformation.cores += 1
				break
			default:
				throw new Error('The upgrade type does not affect the hash gain rate.')
		}
		return this.calculateServerOptimalGainRate(ns, nodeInformation, player)
	}

	private static calculateHashCapacityDelta(ns: NS, server: HacknetServer): number {
		if (server.nodeInformation.cache === ns.formulas.hacknetServers.constants().MaxCache) return 0

		const oldHashCapacity: number = server.nodeInformation.hashCapacity
		return oldHashCapacity - this.calculateHashCapacity(ns, server.nodeInformation.cache + 1)
	}

	private static calculateHashCapacity(ns: NS, cache: number): number {
		return 32 * Math.pow(2, cache)
	}

	private static calculateNewServerCost(ns: NS, servers: HacknetServer[], player: Player): number {
		if (servers.length < ns.formulas.hacknetServers.constants().MaxServers) {
			return ns.formulas.hacknetServers.hacknetServerCost(servers.length + 1, player.hacknet_node_purchase_cost_mult)
		} else return Infinity
	}

	private static getNewServer(ns: NS): HacknetServer {
		const hacknetServerId: number = ns.hacknet.numNodes()
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
		})
	}

	private static calculateNewServerGainRate(ns: NS, player: Player): number {
		const nodeInformation: NodeInformation = {
			level: 1,
			ram: 1,
			cores: 1,
			cache: 1,
			hashCapacity: this.calculateHashCapacity(ns, 1),
		}
		return this.calculateServerOptimalGainRate(ns, nodeInformation, player)
	}

	private static calculateHashUpgrade(ns: NS, server: HacknetServer, type: HacknetServerHashUpgradeType, player: Player): HacknetServerHashUpgrade {
		return {
			server,
			type,
			hashDelta: this.calculateUpgradedServerOptimalGainRateDelta(ns, server, type, player),
			cost: this.calculateUpgradeCost(ns, server, type, player),
			levels: 1,
		}
	}

	private static canAfford(ns: NS, upgrade: HacknetServerUpgrade, budget: number): boolean {
		return upgrade.cost < budget
	}

	private static getBudget(ns: NS): number {
		return PlayerUtils.getMoney(ns) * HACKNET_ALLOWANCE
	}

	private static mergeUpgrades(ns: NS, upgrades: HacknetServerUpgrade[]): HacknetServerUpgrade[] {
		const mergedUpgrades: HacknetServerUpgrade[] = []
		upgrades.forEach((upgrade: HacknetServerUpgrade) => {
			if (upgrade.type === HacknetServerUpgradeType.NEW) {
				mergedUpgrades.push(upgrade)
				return
			}

			const index: number = mergedUpgrades.findIndex((u) => {
				if (u.type === HacknetServerUpgradeType.NEW) return false

				upgrade = upgrade as (HacknetServerCacheUpgrade | HacknetServerHashUpgrade)
				u       = u as HacknetServerCacheUpgrade | HacknetServerHashUpgrade

				return u.server.characteristics.host === upgrade.server.characteristics.host && u.type === upgrade.type
			})

			if (index === -1) mergedUpgrades.push(upgrade)
			else {
				(mergedUpgrades[index] as HacknetServerCacheUpgrade | HacknetServerHashUpgrade).levels += 1
			}
		})
		return mergedUpgrades
	}

	private static generatePotentialUpgrades(ns: NS, hypotheticalServers: HacknetServer[], player: Player) {
		const potentialUpgrades: HacknetServerUpgrade[] = []
		for (const server of hypotheticalServers) {
			const levelUpgrade: HacknetServerHashUpgrade  = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.LEVEL, player)
			const ramUpgrade: HacknetServerHashUpgrade    = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.RAM, player)
			const coresUpgrade: HacknetServerHashUpgrade  = HacknetManager.calculateHashUpgrade(ns, server, HacknetServerUpgradeType.CORES, player)
			const cacheUpgrade: HacknetServerCacheUpgrade = {
				server,
				type: HacknetServerUpgradeType.CACHE,
				cacheDelta: HacknetManager.calculateHashCapacityDelta(ns, server),
				cost: HacknetManager.calculateUpgradeCost(ns, server, HacknetServerUpgradeType.CACHE, player),
				levels: 1,
			}

			potentialUpgrades.push(levelUpgrade, ramUpgrade, coresUpgrade, cacheUpgrade)
		}

		const newServerUpgrade: HacknetServerAddition = {
			type: HacknetServerUpgradeType.NEW,
			cost: HacknetManager.calculateNewServerCost(ns, hypotheticalServers, player),
			hashDelta: HacknetManager.calculateNewServerGainRate(ns, player),
		}
		potentialUpgrades.push(newServerUpgrade)

		return potentialUpgrades
	}

	private static isWorthIt(ns: NS, upgrade: HacknetServerHashUpgrade, payoffTime: number): boolean {
		return this.hashesToMoney(ns, upgrade.hashDelta) * payoffTime >= upgrade.cost
	}

	private static async executeUpgrade(ns: NS, upgrade: HacknetServerUpgrade): Promise<void> {
		let isSuccessful: boolean
		switch (upgrade.type) {
			case HacknetServerUpgradeType.NEW:
				const hacknetServerId: number = ns.hacknet.purchaseNode()

				if (hacknetServerId === -1) throw new Error('We didn\'t manage to buy a new hacknet server.')

				const characteristics: HacknetServerCharacteristics = {
					hacknetServerId,
					id: Utils.generateHash(),
					type: ServerType.HacknetServer,
					host: `${CONSTANT.HACKNET_SERVER_PREFIX}${hacknetServerId}`,
					treeStructure: { // TODO: Move this to the HacknetServer class
						connections: [CONSTANT.HOME_SERVER_ID],
						children: [],
						parent: CONSTANT.HOME_SERVER_ID,
					},
				}
				const server: HacknetServer                         = new HacknetServer(ns, { characteristics })
				await ServerAPI.addServer(ns, server)

				LogAPI.printLog(ns, `Purchased hacknet server ${CONSTANT.HACKNET_SERVER_PREFIX}${hacknetServerId} for ${ns.nFormat(upgrade.cost, '$0.000a')}.`)
				break
			case HacknetServerUpgradeType.RAM:
				isSuccessful = ns.hacknet.upgradeRam(upgrade.server.characteristics.hacknetServerId, upgrade.levels)
				if (!isSuccessful) throw new Error('We didn\'t manage to upgrade the ram.')
				LogAPI.printLog(ns, `Upgraded ram of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`)
				break
			case HacknetServerUpgradeType.CORES:
				isSuccessful = ns.hacknet.upgradeCore(upgrade.server.characteristics.hacknetServerId, upgrade.levels)
				if (!isSuccessful) throw new Error('We didn\'t manage to upgrade the cores.')
				LogAPI.printLog(ns, `Upgraded cores of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`)
				break
			case HacknetServerUpgradeType.LEVEL:
				isSuccessful = ns.hacknet.upgradeLevel(upgrade.server.characteristics.hacknetServerId, upgrade.levels)
				if (!isSuccessful) throw new Error('We didn\'t manage to upgrade the levels.')
				LogAPI.printLog(ns, `Upgraded levels of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`)
				break
			case HacknetServerUpgradeType.CACHE:
				isSuccessful = ns.hacknet.upgradeCache(upgrade.server.characteristics.hacknetServerId, upgrade.levels)
				if (!isSuccessful) throw new Error('We didn\'t manage to upgrade the cache.')
				LogAPI.printLog(ns, `Upgraded cache of hacknet server ${upgrade.server.characteristics.host} by ${upgrade.levels}. Spent ${ns.nFormat(upgrade.cost, '$0.000a')}.`)
				break
			default:
				throw new Error('Upgrade type not recognized.')
		}
	}

	private static hashesToMoney(ns: NS, hashes: number): number {
		return 1e6 * hashes / 4
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the HacknetManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.printTerminal(ns, `Stopping the HacknetManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {
		const hacknetServers: HacknetServer[] = ServerAPI.getHacknetServers(ns)
		const player: Player                  = getPlayer(ns)
		let budget: number                    = HacknetManager.getBudget(ns)

		const oldGainRate: number = HacknetManager.getServerOptimalGainRateTotal(ns, hacknetServers, player)

		const hypotheticalServers: HacknetServer[] = [...hacknetServers]
		const upgrades: HacknetServerUpgrade[]     = []

		while (true) {
			const potentialUpgrades: HacknetServerUpgrade[] = HacknetManager.generatePotentialUpgrades(ns, hypotheticalServers, player)
			                                                                .filter((upgrade) => HacknetManager.canAfford(ns, upgrade, budget))

			// TODO: Consider filtering out the upgrades that have a too long payoff time?

			// Stop if there are no potential upgrades
			if (potentialUpgrades.length === 0) break

			const cacheUpgrade: HacknetServerCacheUpgrade | null = this.findCacheUpgrade(potentialUpgrades)
			if (cacheUpgrade) {
				budget -= cacheUpgrade.cost
				upgrades.push(cacheUpgrade)
				continue
			}

			const hashUpgrade: HacknetServerHashUpgrade | HacknetServerAddition | null = this.findHashUpgrade(ns, potentialUpgrades, hypotheticalServers)
			if (hashUpgrade) {
				budget -= hashUpgrade.cost
				upgrades.push(hashUpgrade)
			} else break // No upgrades worth it
		}

		const mergedUpgrades: HacknetServerUpgrade[] = HacknetManager.mergeUpgrades(ns, upgrades)
		for (const upgrade of mergedUpgrades) {
			await HacknetManager.executeUpgrade(ns, upgrade)
		}

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	private findHashUpgrade(ns: NS, potentialUpgrades: HacknetServerUpgrade[], hypotheticalServers: HacknetServer[]): HacknetServerHashUpgrade | HacknetServerAddition | null {
		const hashUpgrades: (HacknetServerHashUpgrade | HacknetServerAddition)[] = potentialUpgrades.filter((upgrade) => {
			return upgrade.type === HacknetServerUpgradeType.LEVEL ||
				upgrade.type === HacknetServerUpgradeType.CORES ||
				upgrade.type === HacknetServerUpgradeType.RAM ||
				upgrade.type === HacknetServerUpgradeType.NEW
		}) as (HacknetServerHashUpgrade | HacknetServerAddition)[]
		hashUpgrades.sort((a, b) => b.hashDelta - a.hashDelta)

		const hashUpgrade: (HacknetServerHashUpgrade | HacknetServerAddition) = hashUpgrades[0]

		if (hashUpgrade.type !== HacknetServerUpgradeType.NEW) {
			const worthIt: boolean = HacknetManager.isWorthIt(ns, hashUpgrade, PAYOFF_TIME)
			if (!worthIt) return null
		}

		switch (hashUpgrade.type) {
			case HacknetServerUpgradeType.NEW:
				const hypotheticalServer: HacknetServer = HacknetManager.getNewServer(ns)
				hypotheticalServers.push(hypotheticalServer)
				break
			case HacknetServerUpgradeType.LEVEL:
				hashUpgrade.server.nodeInformation.level += 1
				break
			case HacknetServerUpgradeType.RAM:
				hashUpgrade.server.nodeInformation.ram *= 2
				break
			case HacknetServerUpgradeType.CORES:
				hashUpgrade.server.nodeInformation.cores += 1
				break
			default:
				throw new Error('Unexpected upgrade type')
		}
		return hashUpgrade
	}

	private findCacheUpgrade(potentialUpgrades: HacknetServerUpgrade[]): HacknetServerCacheUpgrade | null {
		// Always do cache upgrades, as they will help with hacking as well
		const cacheUpgrades: HacknetServerCacheUpgrade[] = (potentialUpgrades.filter((upgrade) => upgrade.type === HacknetServerUpgradeType.CACHE) as HacknetServerCacheUpgrade[])
			.sort((a, b) => b.cacheDelta - a.cacheDelta)

		if (cacheUpgrades.length > 0) {
			const cacheUpgrade: HacknetServerCacheUpgrade = cacheUpgrades[0]
			// TODO: Check whether this actually upgrades the server value!!!
			cacheUpgrade.server.nodeInformation.cache += 1
			return cacheUpgrade

		} else return null
	}
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: HacknetManager = new HacknetManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}