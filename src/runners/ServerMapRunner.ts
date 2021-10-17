import type { BitBurner as NS }              from 'Bitburner'
import HackableServer                        from '/src/classes/Server/HackableServer.js'
import Server                                from '/src/classes/Server/Server.js'
import { ServerCharacteristics, ServerType } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as ServerUtils                      from '/src/util/ServerUtils.js'
import * as Utils                            from '/src/util/Utils.js'
import { Runner }                            from '/src/classes/Misc/ScriptInterfaces.js'
import { PurchasedServer }                   from '/src/classes/Server/PurchasedServer.js'
import * as ServerAPI                        from '/src/api/ServerAPI.js'
import { HacknetServer }                     from '/src/classes/Server/HacknetServer.js'

class ServerMapRunner implements Runner {

	private static createLeafNode(ns: NS, nodeName: string, id: string, parent: Server): Server[] {
		let type: ServerType

		// Find the type of the server
		if (ServerUtils.isPurchased(nodeName)) type = ServerType.PurchasedServer
		else if (ServerUtils.isHacknet(nodeName)) type = ServerType.HacknetServer
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

		const numberPattern = /\d+/g
		switch (type) {
			case ServerType.HackableServer:
				return [new HackableServer(ns, {
					characteristics,
				})]
			case ServerType.HacknetServer:
				const hacknetServerMatch: RegExpMatchArray | null = nodeName.match(numberPattern)

				if (!hacknetServerMatch) throw new Error('Could not get the id of the purchased server')
				const hacknetServerId: number = parseInt(hacknetServerMatch[0], 10)

				return [new HacknetServer(ns, {
					characteristics: { ...characteristics, hacknetServerId },
				})]
			case ServerType.PurchasedServer:
				const purchasedServerMatch: RegExpMatchArray | null = nodeName.match(numberPattern)

				if (!purchasedServerMatch) throw new Error('Could not get the id of the purchased server')
				const purchasedServerId: number = parseInt(purchasedServerMatch[0], 10)

				return [new PurchasedServer(ns, {
					characteristics: { ...characteristics, purchasedServerId },
				})]
			default:
				return [new Server(ns, {
					characteristics,
				})]
		}
	}

	public async run(ns: NS): Promise<void> {
		ServerAPI.clearServerMap(ns)

		const servers: Server[] = this.createServerList(ns)

		await ServerAPI.writeServerMap(ns, { servers, lastUpdated: new Date() })
	}

	private createServerList(ns: NS): Server[] {
		return this.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST)
	}

	private spider(ns: NS, id: string, nodeName: string, parent?: Server): Server[] {
		const tempServerMap: Server[] = []

		const queue: string[] = ns.scan(nodeName)

		if (parent) {
			const parentIndex: number = queue.indexOf(parent.characteristics.host)
			queue.splice(parentIndex, 1)

			if (queue.length === 0) return ServerMapRunner.createLeafNode(ns, nodeName, id, parent)
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