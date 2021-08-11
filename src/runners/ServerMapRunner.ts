import type { BitBurner as NS }                             from 'Bitburner'
import HackableServer                                       from '/src/classes/HackableServer.js'
import Server                                               from '/src/classes/Server.js'
import { ServerCharacteristics, ServerPurpose, ServerType } from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }                                         from '/src/lib/constants.js'
import * as ServerUtils                                     from '/src/util/ServerUtils.js'
import * as Utils                                           from '/src/util/Utils.js'
import { Runner }                                           from '/src/interfaces/ClassInterfaces.js'
import PurchasedServer                                      from '/src/classes/PurchasedServer.js'
import * as LogAPI                                          from '/src/api/LogAPI.js'
import * as ServerAPI                                       from '/src/api/ServerAPI.js'
import { LogMessageCode }                                   from '/src/interfaces/PortMessageInterfaces.js'

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
		         .forEach((server) => server.purpose = ServerPurpose.PREP)

		const home: Server | undefined = serverMap.find((server) => ServerUtils.isHomeServer(server))

		if (home) home.purpose = ServerPurpose.HACK

		// The prepping servers
		const preppingServers: Server[] = serverMap.filter((server) => ServerUtils.isPurchasedServer(server))
		                                           .sort((a, b) => a.characteristics.host.localeCompare(b.characteristics.host, 'en', { numeric: true }))

		// The hacking servers
		const hackingServers: Server[] = preppingServers.splice(0, CONSTANT.NUM_PURCHASED_HACKING_SERVERS)

		hackingServers.forEach((server) => server.purpose = ServerPurpose.HACK)
		preppingServers.forEach((server) => server.purpose = ServerPurpose.PREP)

		return serverMap
	}

	private spider(ns: NS, id: string, nodeName: string, parent?: Server): Server[] {
		const tempServerMap: Server[] = []

		const queue: string[] = ns.scan(nodeName)

		if (parent) {
			const parentIndex: number = queue.indexOf(parent.characteristics.host)
			queue.splice(parentIndex, 1)

			if (queue.length === 0) return this.createLeafNode(ns, nodeName, id, parent)
		}

		const subtreeNode: Server = this.createSubtreeNode(ns, queue, nodeName, id, parent)

		tempServerMap.push(subtreeNode)

		// Loop through the current level
		queue.forEach((childNodeName: string, index: number) => {
			const childId: string = subtreeNode.characteristics.treeStructure.children[index]

			const children: Server[] = this.spider(ns, childId, childNodeName, subtreeNode)

			tempServerMap.push(...children)
		})

		return tempServerMap
	}

	private createLeafNode(ns: NS, nodeName: string, id: string, parent: Server): Server[] {
		let type: ServerType

		// Find the type of the server
		if (ServerUtils.isPurchased(nodeName)) type = ServerType.PurchasedServer
		else if (ServerUtils.isDarkweb(nodeName)) type = ServerType.DarkWebServer
		else type = ServerType.HackableServer

		const characteristics: ServerCharacteristics = {
			host: nodeName,
			type,
			id,
			treeStructure: {
				connections: [parent.characteristics.id],
				parent: parent.characteristics.id,
				children: [],
			},
		}

		switch (type) {
			case ServerType.HackableServer:
				return [new HackableServer(ns, {
					characteristics,
				})]
			case ServerType.PurchasedServer:
				const numberPattern                  = /\d+/g
				const match: RegExpMatchArray | null = nodeName.match(numberPattern)

				if (!match) throw new Error('Could not get the id of the purchased server')
				const purchasedServerId: number = parseInt(match[0], 10)

				return [new PurchasedServer(ns, {
					characteristics: { ...characteristics, purchasedServerId },
				})]
			default:
				return [new Server(ns, {
					characteristics,
				})]
		}
	}

	private createSubtreeNode(ns: NS, queue: string[], nodeName: string, id: string, parent?: Server): Server {
		const children: string[] = Array.from({ length: queue.length }, () => Utils.generateHash())

		const parentId: string = (parent) ? parent.characteristics.id : ''

		const characteristics: ServerCharacteristics = {
			id,
			type: (parent) ? ServerType.HackableServer : ServerType.HomeServer,
			host: nodeName,
			treeStructure: {
				connections: [...children, parentId],
				children,
				parent: parentId,
			},
		}

		return (parent) ? new HackableServer(ns, { characteristics }) : new Server(ns, { characteristics })
	}
}

export async function main(ns: NS): Promise<void> {
	Utils.disableLogging(ns)

	await (new ServerMapRunner()).run(ns)
}