import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import {
	IPurchasedServer,
	PurchasedServerCharacteristics,
	QuarantinedInformation,
	ServerPurpose,
	TreeStructure,
}                                            from '/src/interfaces/ServerInterfaces.js'
import Server                                from '/src/classes/Server.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as PlayerUtils                      from '/src/util/PlayerUtils.js'

export default class PurchasedServer extends Server {

	characteristics: PurchasedServerCharacteristics

	quarantinedInformation: QuarantinedInformation

	constructor(ns: NS, server: Partial<IPurchasedServer>) {
		super(ns, server)

		if (!server.characteristics) throw new Error('Cannot initialize the purchased server without its characteristics')

		this.characteristics        = server.characteristics
		this.quarantinedInformation = (server.quarantinedInformation) ? server.quarantinedInformation : { quarantined: false }

		this.purpose = (this.isQuarantined()) ? ServerPurpose.NONE : PurchasedServer.determinePurpose(server.characteristics.purchasedServerId)
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

		const cost: number           = ram * CONSTANT.PURCHASED_SERVER_COST_PER_RAM
		const availableMoney: number = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE
		if (cost > availableMoney) return false

		const processes: ProcessInfo[] = ns.ps(this.characteristics.host)
		if (processes.length !== 0) return false

		return true
	}

	public static determinePurpose(id: number): ServerPurpose {
		return (id < CONSTANT.NUM_PURCHASED_HACKING_SERVERS) ? ServerPurpose.HACK : ServerPurpose.PREP
	}

	public static getDefaultTreeStructure(): TreeStructure {
		return {
			connections: [CONSTANT.HOME_SERVER_ID],
			parent: CONSTANT.HOME_SERVER_ID,
			children: [],
		}
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