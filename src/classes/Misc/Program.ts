import type { BitBurner as NS, PurchaseableProgram } from 'Bitburner'
import * as LogAPI                                   from '/src/api/LogAPI.js'
import Server                                        from '/src/classes/Server/Server.js'
import * as PlayerUtils                              from '/src/util/PlayerUtils.js'

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

	private static toValidString(name: string): PurchaseableProgram {
		return (name.toLowerCase() as PurchaseableProgram)
	}

	public hasProgram(ns: NS) {
		return ns.fileExists(this.name, 'home')
	}

	// Returns whether it was successful
	public attemptPurchase(ns: NS): boolean {
		const money: number = PlayerUtils.getMoney(ns)

		if (this.price > money) return false

		const isSuccessful: boolean = ns.purchaseProgram(Program.toValidString(this.name))

		if (isSuccessful) {
			LogAPI.printTerminal(ns, `Purchased ${this.name}`)
		}

		return isSuccessful
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