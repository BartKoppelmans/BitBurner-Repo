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
		const parentServerId: string = currentServer.characteristics.treeStructure.parent

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
		ns.connect(node.characteristics.host)
	}
}