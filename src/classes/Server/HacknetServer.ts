import type { BitBurner as NS, NodeStats, Player } from 'Bitburner'
import {
	HacknetServerCharacteristics,
	IHacknetServer,
	NodeInformation,
	TreeStructure,
}                                                  from '/src/classes/Server/ServerInterfaces.js'
import Server                                      from '/src/classes/Server/Server.js'
import { CONSTANT }                               from '/src/lib/constants.js'

export class HacknetServer extends Server implements IHacknetServer {

	characteristics: HacknetServerCharacteristics
	nodeInformation!: NodeInformation

	constructor(ns: NS, server: Partial<IHacknetServer>) {
		super(ns, server)

		if (!server.characteristics) throw new Error('Cannot initialize the hacknet server without its characteristics')

		this.characteristics = server.characteristics

		if (!server.nodeInformation) this.nodeInformation = HacknetServer.getNodeInformation(ns, this.characteristics.hacknetServerId)
		else this.nodeInformation = server.nodeInformation
	}

	public static getNodeInformation(ns: NS, id: number): NodeInformation {
		const nodeStats: NodeStats = ns.hacknet.getNodeStats(id)
		return {
			level: nodeStats.level,
			ram: nodeStats.ram,
			cores: nodeStats.cores,
			cache: nodeStats.cache,
			hashCapacity: nodeStats.hashCapacity,
		}
	}

	public static getDefaultTreeStructure(): TreeStructure {
		return {
			connections: [CONSTANT.HOME_SERVER_ID],
			parent: CONSTANT.HOME_SERVER_ID,
			children: [],
		}
	}

	public getGainRate(ns: NS, player: Player): number {
		return ns.formulas.hacknetServers.hashGainRate(
			this.nodeInformation.level,
			0,
			this.nodeInformation.ram,
			this.nodeInformation.cores,
			player.hacknet_node_money_mult)
	}

	public toJSON() {
		const json: any = super.toJSON()

		return {
			...json,
			characteristics: this.characteristics,
		}

	}
}