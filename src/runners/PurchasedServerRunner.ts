import type { BitBurner as NS }                                      from 'Bitburner'
import * as LogAPI                                                   from '/src/api/LogAPI.js'
import { LogType }                                                   from '/src/api/LogAPI.js'
import * as ServerAPI                                                from '/src/api/ServerAPI.js'
import { PurchasedServerCharacteristics, ServerPurpose, ServerType } from '/src/classes/Server/ServerInterfaces.js'
import * as Utils                                                    from '/src/util/Utils.js'
import PurchasedServer                                               from '/src/classes/Server/PurchasedServer.js'
import * as PlayerUtils                                              from '/src/util/PlayerUtils.js'
import Server                                                        from '/src/classes/Server/Server.js'
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
		return ns.getPurchasedServerCost(ram)
	}

	public async run(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Running the PurchasedServerRunner`)

		const purchasedServerList: PurchasedServer[] = ServerAPI.getPurchasedServers(ns)

		if (purchasedServerList.length < ns.getPurchasedServerLimit()) {
			this.purchaseServers(ns, purchasedServerList)
		} else {
			this.upgradeServers(ns, purchasedServerList)
		}
	}

	private purchaseServers(ns: NS, purchasedServerList: PurchasedServer[]): void {
		const numServersLeft: number = ns.getPurchasedServerLimit() - purchasedServerList.length

		for (let i = 0; i < numServersLeft; i++) {
			const ram: number = this.computeMaxRamPossible(ns)

			// We stop if we cannot purchase any more servers
			if (ram === -1) break

			const id: number = purchasedServerList.length + i

			const purchasedServer: PurchasedServer = this.purchaseNewServer(ns, ram, id)
			if (!purchasedServer) {
				throw new Error('We could not successfully purchase the server')
			}
		}
	}

	private purchaseNewServer(ns: NS, ram: number, purchasedServerId: number): PurchasedServer {
		const host: string         = CONSTANT.PURCHASED_SERVER_PREFIX + purchasedServerId.toString()
		const boughtServer: string = ns.purchaseServer(host, ram)

		if (boughtServer === '') throw new Error('Could not purchase the server')

		LogAPI.log(ns, `Purchased server ${boughtServer} with ${ram}GB ram.`, LogType.PURCHASED_SERVER)

		const characteristics: PurchasedServerCharacteristics = {
			id: Utils.generateHash(),
			type: ServerType.PurchasedServer,
			host,
			purchasedServerId,
			treeStructure: PurchasedServer.getDefaultTreeStructure(),
		}

		const server: PurchasedServer = new PurchasedServer(ns, { characteristics })

		ServerAPI.addServer(ns, server)

		return server
	}

	private upgradeServers(ns: NS, purchasedServerList: PurchasedServer[]): void {
		const quarantinedServers: PurchasedServer[] = purchasedServerList.filter((s) => s.isQuarantined())

		for (const server of quarantinedServers) {
			const ram: number = server.quarantinedInformation.ram!
			if (server.canUpgrade(ns, ram)) {
				ServerAPI.upgradeServer(ns, server, ram)
			}
		}

		for (const server of purchasedServerList) {
			if (server.isQuarantined()) continue

			const shouldUpgrade: boolean = this.shouldUpgrade(ns, server.purpose)
			if (!shouldUpgrade) continue

			const maxRam: number = this.computeMaxRamPossible(ns)
			if (maxRam > server.getTotalRam(ns)) {
				ServerAPI.quarantine(ns, server, maxRam)
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
		const money: number = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE - reservedMoney

		return cost <= money
	}

	private shouldUpgrade(ns: NS, purpose: ServerPurpose): boolean {
		const serverMap: Server[] = (purpose === ServerPurpose.HACK) ? ServerAPI.getHackingServers(ns) : ServerAPI.getPreppingServers(ns)

		const utilized: number = serverMap.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0)
		const total: number    = serverMap.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0)

		return ((utilized / total) > UTILIZATION_THRESHOLD)
	}

	private getReservedMoney(ns: NS): number {
		const purchasedServerList: PurchasedServer[]   = ServerAPI.getPurchasedServers(ns)
		const quarantinedServerList: PurchasedServer[] = purchasedServerList.filter((s) => s.isQuarantined())

		return quarantinedServerList.reduce((reservedMoney, server) => reservedMoney + PurchasedServerRunner.getCost(ns, server.quarantinedInformation.ram!), 0)
	}

}

export async function main(ns: NS) {
	Utils.disableLogging(ns)

	await (new PurchasedServerRunner()).run(ns)
}