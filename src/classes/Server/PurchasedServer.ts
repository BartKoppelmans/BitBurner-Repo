import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import {
	IPurchasedServer,
	PurchasedServerCharacteristics,
	QuarantinedInformation,
	ServerPurpose,
	TreeStructure,
}                                            from '/src/classes/Server/ServerInterfaces.js'
import Server                                from '/src/classes/Server/Server.js'
import {
	CONSTANT,
}                                            from '/src/lib/constants.js'
import * as PlayerUtils                      from '/src/util/PlayerUtils.js'

const PERCENTAGE_HACK_PURPOSE: number = 0.4

export class PurchasedServer extends Server implements IPurchasedServer {

	characteristics: PurchasedServerCharacteristics
	quarantinedInformation: QuarantinedInformation

	constructor(ns: NS, server: Partial<IPurchasedServer>) {
		super(ns, server)

		if (!server.characteristics) throw new Error('Cannot initialize the purchased server without its characteristics')

		this.characteristics        = server.characteristics
		this.quarantinedInformation = (server.quarantinedInformation) ? server.quarantinedInformation : { quarantined: false }

		if (this.isQuarantined()) this.purpose = ServerPurpose.NONE
		else {
			// Set to the last known purpose, or use the default
			this.purpose = server.purpose ? server.purpose : PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId)
		}
	}

	public static determinePurpose(ns: NS, id: number): ServerPurpose {
		return (id < Math.ceil(PERCENTAGE_HACK_PURPOSE * ns.getPurchasedServerLimit())) ? ServerPurpose.HACK : ServerPurpose.PREP
	}

	public static getDefaultTreeStructure(): TreeStructure {
		return {
			connections: [CONSTANT.HOME_SERVER_ID],
			parent: CONSTANT.HOME_SERVER_ID,
			children: [],
		}
	}

	public hasPurpose(purpose: ServerPurpose): boolean {
		if (this.quarantinedInformation.quarantined) {
			return this.quarantinedInformation.originalPurpose === purpose
		} else return this.purpose === purpose
	}

	public isQuarantined(): boolean {
		return this.quarantinedInformation.quarantined
	}

	// TODO: We might want to move this outside of this class
	public canUpgrade(ns: NS, ram: number): boolean {
		// Do this to make sure that we have the value for ram
		if (!this.quarantinedInformation.quarantined || !this.quarantinedInformation.ram) return false

		// TODO: Since we do not keep track of reserved money, we might just not pass the next check
		// We might want to skip it?

		const cost: number           = ns.getPurchasedServerCost(ram)
		const availableMoney: number = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE
		if (cost > availableMoney) return false

		const processes: ProcessInfo[] = ns.ps(this.characteristics.host)
		if (processes.length !== 0) return false

		return true
	}

	public toJSON() {
		const json: any = super.toJSON()

		return {
			...json,
			characteristics: this.characteristics,
			quarantinedInformation: this.quarantinedInformation,
		}

	}
}