import type { NS }                                                   from 'Bitburner'
import * as LogAPI                                                   from '/src/api/LogAPI.js'
import * as ServerAPI                                                from '/src/api/ServerAPI.js'
import { PurchasedServerCharacteristics, ServerPurpose, ServerType } from '/src/classes/Server/ServerInterfaces.js'
import * as Utils                                                    from '/src/util/Utils.js'
import { PurchasedServer }                                           from '/src/classes/Server/PurchasedServer.js'
import * as PlayerUtils                                              from '/src/util/PlayerUtils.js'
import { CONSTANT }                                                  from '/src/lib/constants.js'

const MIN_RAM_EXPONENT: number      = 4 as const
const UTILIZATION_THRESHOLD: number = 0.8 as const

class PurchasedServerRunner {

	private static getMaxRam(ns: NS): number {
		return ns.getPurchasedServerMaxRam()
	}

	private static getMaxRamExponent(ns: NS): number {
		return this.ramToExponent(this.getMaxRam(ns))
	}

	private static exponentToRam(exponent: number): number {
		return Math.pow(2, exponent)
	}

	private static ramToExponent(ram: number): number {
		return Math.log2(ram)
	}

	private static getCost(ns: NS, ram: number): number {
		// TODO: Update to facilitate new costs
		return ns.getPurchasedServerCost(ram)
	}

	private static async purchaseNewServer(ns: NS, ram: number, purchasedServerId: number): Promise<PurchasedServer> {
		const host: string         = CONSTANT.PURCHASED_SERVER_PREFIX + purchasedServerId.toString()
		const boughtServer: string = ns.purchaseServer(host, ram)

		if (boughtServer === '') throw new Error('Could not purchase the server')

		LogAPI.printTerminal(ns, `Purchased server ${boughtServer} with ${ram}GB ram.`)

		const characteristics: PurchasedServerCharacteristics = {
			id: Utils.generateHash(),
			type: ServerType.PurchasedServer,
			host,
			purchasedServerId,
			treeStructure: PurchasedServer.getDefaultTreeStructure(),
		}

		const server: PurchasedServer = new PurchasedServer(ns, { characteristics })

		await ServerAPI.addServer(ns, server)

		return server
	}

	private static shouldUpgrade(ns: NS, purpose: ServerPurpose): boolean {
		const purchasedServers: PurchasedServer[] = ServerAPI.getPurchasedServers(ns)
		const utilization: number                 = ServerAPI.getServerUtilization(ns, purchasedServers, purpose)
		return (utilization > UTILIZATION_THRESHOLD)
	}

	public async run(ns: NS): Promise<void> {

		if (ns.getPurchasedServerLimit() === 0) return

		const purchasedServerList: PurchasedServer[] = ServerAPI.getPurchasedServers(ns)

		if (purchasedServerList.length < ns.getPurchasedServerLimit()) {
			await this.purchaseServers(ns, purchasedServerList)
		} else {
			await this.upgradeServers(ns, purchasedServerList)
		}
	}

	private async purchaseServers(ns: NS, purchasedServerList: PurchasedServer[]): Promise<void> {
		const numServersLeft: number = ns.getPurchasedServerLimit() - purchasedServerList.length

		for (let i = 0; i < numServersLeft; i++) {
			const ram: number = this.computeMaxRamPossible(ns)

			// We stop if we cannot purchase any more servers
			if (ram === -1) break

			const id: number = purchasedServerList.length + i

			const purchasedServer: PurchasedServer = await PurchasedServerRunner.purchaseNewServer(ns, ram, id)
			if (!purchasedServer) {
				throw new Error('We could not successfully purchase the server')
			}
		}
	}

	private async upgradeServers(ns: NS, purchasedServerList: PurchasedServer[]): Promise<void> {
		const quarantinedServers: PurchasedServer[] = purchasedServerList.filter((s) => s.isQuarantined())

		for (const server of quarantinedServers) {
			if (!server.quarantinedInformation.quarantined) continue

			const ram: number = server.quarantinedInformation.ram
			if (server.canUpgrade(ns, ram)) {
				await ServerAPI.upgradeServer(ns, server.characteristics.host, ram)
			}
		}

		const shouldUpgradePrep: boolean = PurchasedServerRunner.shouldUpgrade(ns, ServerPurpose.PREP)
		const shouldUpgradeHack: boolean = PurchasedServerRunner.shouldUpgrade(ns, ServerPurpose.HACK)

		if (!shouldUpgradeHack && !shouldUpgradePrep) return

		for (const server of purchasedServerList) {
			if (server.isQuarantined()) continue

			if (server.purpose === ServerPurpose.HACK && !shouldUpgradeHack) continue
			else if (server.purpose === ServerPurpose.PREP && !shouldUpgradePrep) continue

			const maxRam: number = this.computeMaxRamPossible(ns)
			if (maxRam > server.getTotalRam(ns)) {
				await ServerAPI.quarantine(ns, server.characteristics.host, maxRam)
			} else break
		}
	}

	private computeMaxRamPossible(ns: NS): number {
		const canPurchase: boolean = this.canAfford(ns, PurchasedServerRunner.exponentToRam(MIN_RAM_EXPONENT))

		if (!canPurchase) return -1

		// We want to start at 8 gigabytes, cause otherwise it's not worth it
		let exponent: number = MIN_RAM_EXPONENT - 1

		for (exponent; exponent < PurchasedServerRunner.getMaxRamExponent(ns); exponent++) {

			// Stop if we can't afford a next upgrade
			const canAfford: boolean = this.canAfford(ns, Math.pow(2, exponent + 1))
			if (!canAfford) break
		}

		return Math.min(PurchasedServerRunner.exponentToRam(exponent), ns.getPurchasedServerMaxRam())
	}

	private canAfford(ns: NS, ram: number): boolean {
		const cost: number  = PurchasedServerRunner.getCost(ns, ram)
		const reservedMoney = this.getReservedMoney(ns)
		const money: number = (PlayerUtils.getMoney(ns) - reservedMoney) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE

		return cost <= money
	}

	private getReservedMoney(ns: NS): number {
		const purchasedServerList: PurchasedServer[]   = ServerAPI.getPurchasedServers(ns)
		const quarantinedServerList: PurchasedServer[] = purchasedServerList.filter((s) => s.isQuarantined())

		return quarantinedServerList.reduce((reservedMoney: number, server: PurchasedServer) => {
			if (server.quarantinedInformation.quarantined) {
				return reservedMoney + PurchasedServerRunner.getCost(ns, server.quarantinedInformation.ram)
			} else return reservedMoney
		}, 0)
	}

}

export async function main(ns: NS) {
	Utils.disableLogging(ns)

	await (new PurchasedServerRunner()).run(ns)
}