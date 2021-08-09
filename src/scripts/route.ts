import type { BitBurner as NS } from 'Bitburner'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import Server                   from '/src/classes/Server.js'
import { CONSTANT }             from '/src/lib/constants.js'
import { ServerMap }            from '/src/interfaces/ServerInterfaces.js'

async function findPath(ns: NS, server: Server): Promise<Server[]> {

	const isInitialized: boolean = await ServerAPI.isServerMapInitialized(ns)
	if (!isInitialized) await ServerAPI.initializeServerMap(ns)

	const path: Server[] = [server]

	let currentServer = server
	while (currentServer.characteristics.host !== CONSTANT.HOME_SERVER_HOST) {
		if (!currentServer.treeStructure) {
			throw new Error('The tree structure was not correctly created')
		}

		const parentServerId: number | undefined = currentServer.treeStructure.parent

		if (!parentServerId) {
			// In this case, the server can be found from the home server as well.
			break
		}

		currentServer = await ServerAPI.getServer(ns, parentServerId)
		path.unshift(currentServer)
	}

	return path
}

export async function main(ns: NS) {

	const serverName: string = ns.args[0]

	if (!serverName) {
		ns.tprint('Please provide a server to connect with.')
		return
	}

	const serverMap: ServerMap = await ServerAPI.getServerMap(ns)

	const server: Server | undefined = serverMap.servers.find((s) => s.characteristics.host === serverName)

	if (!server) {
		ns.tprint('Cannot find server ' + serverName)
		return
	}

	const path: Server[] = await findPath(ns, server)

	for (const node of path) {
		const isSuccessful: boolean = ns.connect(node.characteristics.host)
	}
}