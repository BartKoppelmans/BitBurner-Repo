import type { BitBurner as NS }                                            from 'Bitburner'
import HackableServer                                                      from '/src/classes/HackableServer.js'
import Server                                                              from '/src/classes/Server.js'
import { ServerCharacteristics, ServerPurpose, ServerType, TreeStructure } from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }                                                        from '/src/lib/constants.js'
import * as ServerUtils                                                    from '/src/util/ServerUtils.js'
import * as Utils                                                          from '/src/util/Utils.js'
import { Runner }                                                          from '/src/interfaces/ClassInterfaces.js'
import PurchasedServer                                                     from '/src/classes/PurchasedServer.js'
import * as LogAPI                                                         from '/src/api/LogAPI.js'
import * as ServerAPI                                                      from '/src/api/ServerAPI.js'
import { LogMessageCode }                                                  from '/src/interfaces/PortMessageInterfaces.js'

class ServerMapRunner implements Runner {

	public async run(ns: NS): Promise<void> {

		await LogAPI.log(ns, `Running the ServerMapRunner`, true, LogMessageCode.INFORMATION)

		await ServerAPI.clearServerMap(ns)

		const servers: Server[] = this.createServerList(ns)

		await ServerAPI.writeServerMap(ns, { servers, lastUpdated: new Date() })
	}

	private createServerList(ns: NS): Server[] {
		const serverMap: Server[] = this.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST)

		serverMap.filter((server) => ServerUtils.isHackableServer(server))
		         .forEach((server) => server.setPurpose(ServerPurpose.PREP))

		const home: Server | undefined = serverMap.find((server) => ServerUtils.isHomeServer(server))

		if (home) home.setPurpose(ServerPurpose.HACK)

		// The prepping servers
		const preppingServers: Server[] = serverMap.filter((server) => ServerUtils.isPurchasedServer(server))
		                                           .sort((a, b) => a.characteristics.host.localeCompare(b.characteristics.host, 'en', { numeric: true }))

		// The hacking servers
		const hackingServers: Server[] = preppingServers.splice(0, CONSTANT.NUM_PURCHASED_HACKING_SERVERS)

		hackingServers.forEach((server) => server.setPurpose(ServerPurpose.HACK))
		preppingServers.forEach((server) => server.setPurpose(ServerPurpose.PREP))

		return serverMap
	}

	private spider(ns: NS, id: number, nodeName: string, parent?: Server): Server[] {
		let tempServerMap: Server[] = []

		const queue: string[] = ns.scan(nodeName)

		if (parent) {
			const parentIndex: number = queue.indexOf(parent.characteristics.host)
			queue.splice(parentIndex, 1)

			// The current node is a leaf
			if (queue.length === 0) {

				let type: ServerType

				// Find the type of the server
				if (ServerUtils.isPurchased(nodeName)) type = ServerType.PurchasedServer
				else if (ServerUtils.isDarkweb(nodeName)) type = ServerType.DarkWebServer
				else type = ServerType.HackableServer

				const serverCharacteristics: ServerCharacteristics = {
					host: nodeName,
					type,
					id,
				}

				const serverTreeStructure = {
					connections: [parent.characteristics.id],
					parent: parent.characteristics.id,
					children: [],
				}

				switch (type) {
					case ServerType.HackableServer:
						return [new HackableServer(ns, serverCharacteristics, serverTreeStructure)]
					case ServerType.PurchasedServer:
						const numberPattern                  = /\d+/g
						const match: RegExpMatchArray | null = nodeName.match(numberPattern)

						if (!match) throw new Error('Could not get the id of the purchased server')
						const purchasedServerId: number = parseInt(match[0], 10)

						return [new PurchasedServer(ns, {
							...serverCharacteristics,
							purchasedServerId,
						})]
					default:
						return [new Server(ns, serverCharacteristics, serverTreeStructure)]
				}
			}

		}

		// TODO: Simplify this part or split in different functions

		// The current node is a subtree node
		let subtreeNode: Server
		let subtreeCharacteristics: ServerCharacteristics
		if (parent) {
			subtreeCharacteristics = { id, type: ServerType.HackableServer, host: nodeName }
			subtreeNode            = new HackableServer(ns, subtreeCharacteristics, { parent: parent.characteristics.id })
		} else {
			subtreeCharacteristics = { id, type: ServerType.HomeServer, host: CONSTANT.HOME_SERVER_HOST }
			subtreeNode            = new Server(ns, subtreeCharacteristics)
		}

		let currentId = id
		// Loop through the current level
		queue.forEach((childNodeName: string) => {
			tempServerMap = [
				...tempServerMap,
				...this.spider(ns, currentId + 1, childNodeName, subtreeNode),
			]

			currentId = Math.max.apply(Math, tempServerMap.map((server) => server.characteristics.id))
		})

		const children: Server[] = tempServerMap.filter(node => queue.includes(node.characteristics.host))

		// Create the subtree structure
		let subtreeStructure: TreeStructure
		if (parent) {
			subtreeStructure = {
				connections: [...children.map((server) => server.characteristics.id), parent.characteristics.id],
				children: children.map((server) => server.characteristics.id),
				parent: parent.characteristics.id,
			}
		} else {
			subtreeStructure = {
				connections: children.map((server) => server.characteristics.id),
				children: children.map((server) => server.characteristics.id),
			}
		}

		subtreeNode.updateTreeStructure(subtreeStructure)

		return [
			...tempServerMap,
			subtreeNode,
		]
	}

}

export async function main(ns: NS): Promise<void> {
	Utils.disableLogging(ns)

	await (new ServerMapRunner()).run(ns)
}