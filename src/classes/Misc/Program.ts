import type { BitBurner as NS, PurchaseableProgram } from 'Bitburner'
import * as LogAPI                                   from '/src/api/LogAPI.js'
import Server                                        from '/src/classes/Server/Server.js'
import * as PlayerUtils                              from '/src/util/PlayerUtils.js'
import { LogType }                                   from '/src/api/LogAPI.js'

export enum ProgramType {
	Crack,
	Util
}

export class Program {
	name: string
	price: number
	type: ProgramType

	constructor(ns: NS, name: string, price: number, type: ProgramType) {
		this.name  = name
		this.price = price
		this.type  = type
	}

	public hasProgram(ns: NS) {
		return ns.fileExists(this.name, 'home')
	}

	// Returns whether it was successful
	public async attemptPurchase(ns: NS): Promise<boolean> {
		const money: number = PlayerUtils.getMoney(ns)

		if (this.price > money) return false

		const isSuccessful: boolean = ns.purchaseProgram(this.toValidString(ns, this.name))

		if (isSuccessful) {
			LogAPI.log(ns, `Purchased ${this.name}`, LogType.INFORMATION)
		}

		return isSuccessful
	}

	private toValidString(ns: NS, name: string): PurchaseableProgram {
		return (name.toLowerCase() as PurchaseableProgram)
	}

	public run(ns: NS, server: Server) {
		switch (this.name) {
			case 'BruteSSH.exe':
				return ns.brutessh(server.characteristics.host)
			case 'FTPCrack.exe':
				return ns.ftpcrack(server.characteristics.host)
			case 'relaySMTP.exe':
				return ns.relaysmtp(server.characteristics.host)
			case 'HTTPWorm.exe':
				return ns.httpworm(server.characteristics.host)
			case 'SQLInject.exe':
				return ns.sqlinject(server.characteristics.host)
			default:
				throw new Error(`Program "${this.name}" not found.`)
		}
	}
}