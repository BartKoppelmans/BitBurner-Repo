import type { BitBurner as NS } from 'Bitburner'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import {
	PurchasedServerCharacteristics,
	PurchasedServerList,
	ServerPurpose,
	ServerType,
}                               from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'
import * as Utils               from '/src/util/Utils.js'
import PurchasedServer          from '/src/classes/PurchasedServer.js'
import * as PlayerUtils         from '/src/util/PlayerUtils.js'
import Server                   from '/src/classes/Server.js'
import { LogType }              from '/src/interfaces/LogInterfaces.js'


class PurchasedServerRunner {

	public async run(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Running the PurchasedServerRunner`)

		const purchasedServerList: PurchasedServerList = await ServerAPI.getPurchasedServers(ns)

		if (purchasedServerList.length < CONSTANT.MAX_PURCHASED_SERVERS) {
			await this.purchaseServers(ns, purchasedServerList)
		} else {
			await this.upgradeServers(ns, purchasedServerList)
		}
	}

	private async purchaseServers(ns: NS, purchasedServerList: PurchasedServerList): Promise<void> {
		const numServersLeft: number = CONSTANT.MAX_PURCHASED_SERVERS - purchasedServerList.length

		for (let i = 0; i < numServersLeft; i++) {
			const ram: number = await this.computeMaxRamPossible(ns)

			// We stop if we cannot purchase any more servers
			if (ram === -1) break

			const id: number = purchasedServerList.length + i

			const purchasedServer: PurchasedServer = await this.purchaseNewServer(ns, ram, id)
			if (!purchasedServer) {
				throw new Error('We could not successfully purchase the server')
			}
		}
	}

	private async purchaseNewServer(ns: NS, ram: number, purchasedServerId: number): Promise<PurchasedServer> {
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

		await ServerAPI.addServer(ns, server)

		return server
	}

	private async upgradeServers(ns: NS, purchasedServerList: PurchasedServerList): Promise<void> {
		const quarantinedServers: PurchasedServerList = purchasedServerList.filter((s) => s.isQuarantined())

		for (const server of quarantinedServers) {
			const ram: number = server.quarantinedInformation.ram!
			if (server.canUpgrade(ns, ram)) {
				await ServerAPI.upgradeServer(ns, server, ram)
			}
		}

		for (const server of purchasedServerList) {
			if (server.isQuarantined()) continue

			const shouldUpgrade: boolean = await this.shouldUpgrade(ns, server.purpose)
			if (!shouldUpgrade) continue

			const maxRam: number = await this.computeMaxRamPossible(ns)
			if (maxRam > server.getTotalRam(ns)) {
				await ServerAPI.quarantine(ns, server, maxRam)
			} else break
		}
	}

	private async computeMaxRamPossible(ns: NS): Promise<number> {
		const canPurchase: boolean = await this.canAfford(ns, Math.pow(2, CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT))

		if (!canPurchase) return -1

		// We want to start at 8 gigabytes, cause otherwise it's not worth it
		let exponent: number = CONSTANT.MIN_PURCHASED_SERVER_RAM_EXPONENT - 1

		for (exponent; exponent < CONSTANT.MAX_PURCHASED_SERVER_RAM_EXPONENT; exponent++) {

			// Stop if we can't afford a next upgrade
			const canAfford: boolean = await this.canAfford(ns, Math.pow(2, exponent + 1))
			if (!canAfford) break
		}

		return Math.min(Math.pow(2, exponent), ns.getPurchasedServerMaxRam())
	}

	private async canAfford(ns: NS, ram: number): Promise<boolean> {
		const cost: number  = ram * CONSTANT.PURCHASED_SERVER_COST_PER_RAM
		const reservedMoney = await this.getReservedMoney(ns)
		const money: number = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE - reservedMoney

		return cost <= money
	}


	private async shouldUpgrade(ns: NS, purpose: ServerPurpose): Promise<boolean> {
		const serverMap: Server[] = (purpose === ServerPurpose.HACK) ? await ServerAPI.getHackingServers(ns) : await ServerAPI.getPreppingServers(ns)

		const utilized: number = serverMap.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0)
		const total: number    = serverMap.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0)

		return ((utilized / total) > CONSTANT.PURCHASED_SERVER_UPGRADE_UTILIZATION_THRESHOLD)
	}

	private async getReservedMoney(ns: NS): Promise<number> {
		const purchasedServerList: PurchasedServerList   = await ServerAPI.getPurchasedServers(ns)
		const quarantinedServerList: PurchasedServerList = purchasedServerList.filter((s) => s.isQuarantined())

		return quarantinedServerList.reduce((reservedMoney, server) => reservedMoney + (server.quarantinedInformation.ram! * CONSTANT.PURCHASED_SERVER_COST_PER_RAM), 0)
	}

}

export async function main(ns: NS) {
	Utils.disableLogging(ns)

	await (new PurchasedServerRunner()).run(ns)
}