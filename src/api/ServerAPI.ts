import type { BitBurner as NS }                                       from 'Bitburner'
import HackableServer                                                 from '/src/classes/Server/HackableServer.js'
import Server                                                         from '/src/classes/Server/Server.js'
import { ServerMap, ServerPurpose, ServerSortingOrder, ServerStatus } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }                                                   from '/src/lib/constants.js'
import * as ServerUtils                                               from '/src/util/ServerUtils.js'
import * as SerializationUtils                                        from '/src/util/SerializationUtils.js'
import * as LogAPI                                                    from '/src/api/LogAPI.js'
import PurchasedServer                                                from '/src/classes/Server/PurchasedServer.js'

const MIN_NUMBER_PURPOSED_SERVERS: number = 2 as const

export function getServerMap(ns: NS): ServerMap {
	return readServerMap(ns)
}

function readServerMap(ns: NS): ServerMap {

	// TODO: Build in more robustness checks here

	const serverMapString: string = ns.read(CONSTANT.SERVER_MAP_FILENAME).toString()

	const serverMap: ServerMap = JSON.parse(serverMapString)
	serverMap.lastUpdated      = new Date(serverMap.lastUpdated)

	const serverObjects: Server[] = Array.from(serverMap.servers)
	serverMap.servers             = []

	for (const server of serverObjects) {
		serverMap.servers.push(SerializationUtils.serverFromJSON(ns, server))
	}

	return serverMap
}

export function clearServerMap(ns: NS): void {
	ns.clear(CONSTANT.SERVER_MAP_FILENAME)
}

export function writeServerMap(ns: NS, serverMap: ServerMap): void {
	// NOTE: Do we want to do this?
	serverMap.lastUpdated = new Date()
	ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w')
}

export function updateServer(ns: NS, server: Server): void {
	const serverMap: ServerMap = getServerMap(ns)
	const index: number        = serverMap.servers.findIndex((s) => s.characteristics.host === server.characteristics.host)

	if (index === -1) throw new Error('Could not find the server.')

	serverMap.servers[index] = server

	writeServerMap(ns, serverMap)
}

export function setPurpose(ns: NS, host: string, purpose: ServerPurpose, force: boolean = false): void {
	const server: Server = getServerByName(ns, host)

	if (ServerUtils.isPurchasedServer(server) && !force) {
		if (server.quarantinedInformation.quarantined) {
			server.quarantinedInformation.originalPurpose = purpose
		} else server.purpose = purpose
	} else server.purpose = purpose

	updateServer(ns, server)
}

export function setStatus(ns: NS, host: string, status: ServerStatus): void {
	const server: Server = getServerByName(ns, host)
	if (!ServerUtils.isHackableServer(server)) throw new Error('The server is not a hackable server')
	server.status = status
	updateServer(ns, server)
}

export function addServer(ns: NS, server: Server): void {
	const serverMap: ServerMap = getServerMap(ns)

	const serverAlreadyExists: boolean = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host)
	if (serverAlreadyExists) throw new Error('Cannot add a server that already exists in the list')

	serverMap.servers.push(server)

	writeServerMap(ns, serverMap)
}

export function getServerUtilization(ns: NS, onlyPurchasedServers: boolean, serverPurpose?: ServerPurpose): number {

	let serverMap: Server[]
	if (serverPurpose === ServerPurpose.HACK) serverMap = getHackingServers(ns)
	else if (serverPurpose === ServerPurpose.PREP) serverMap = getPreppingServers(ns)
	else serverMap = getServerMap(ns).servers

	if (onlyPurchasedServers) serverMap = serverMap.filter((server) => ServerUtils.isPurchasedServer(server))

	const utilized: number = serverMap.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0)
	const total: number    = serverMap.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0)

	return (utilized / total)
}

export function quarantine(ns: NS, host: string, ram: number): void {
	const server: Server = getServerByName(ns, host)

	if (!ServerUtils.isPurchasedServer(server)) throw new Error('Cannot quarantine a normal server')

	server.quarantinedInformation = { quarantined: true, ram, originalPurpose: server.purpose }
	server.purpose                = ServerPurpose.NONE

	updateServer(ns, server)

	LogAPI.log(ns, `We put ${server.characteristics.host} into quarantine`)
}

export function upgradeServer(ns: NS, host: string, ram: number): void {
	const server: Server = getServerByName(ns, host)

	if (!ServerUtils.isPurchasedServer(server)) throw new Error('Cannot quarantine a normal server')

	// TODO: Do some checks here

	if (!server.canUpgrade(ns, ram)) throw new Error('Cannot upgrade the server.')

	// TODO: Perhaps we should check here again how much we can actually purchase

	const deletedServer: boolean = ns.deleteServer(host)
	if (!deletedServer) throw new Error(`Could not delete server ${host}`)

	const boughtServer: string = ns.purchaseServer(host, ram)
	if (boughtServer) {
		LogAPI.log(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`)
	} else throw new Error('Could not purchase the server again.')

	server.purpose                = PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId)
	server.quarantinedInformation = { quarantined: false }

	updateServer(ns, server)
}

export function increaseReservation(ns: NS, host: string, reservation: number): void {
	const server: Server = getServerByName(ns, host)
	reservation          = Math.round(reservation * 100) / 100
	server.increaseReservation(ns, reservation)
	updateServer(ns, server)
}

export function decreaseReservation(ns: NS, host: string, reservation: number): void {
	const server: Server = getServerByName(ns, host)
	reservation          = Math.round(reservation * 100) / 100
	server.decreaseReservation(ns, reservation)
	updateServer(ns, server)
}

export function getServer(ns: NS, id: string): Server {
	const server: Server | undefined = getServerMap(ns).servers.find(s => s.characteristics.id === id)
	if (!server) throw new Error('Could not find that server.')
	return server
}

export function getServerByName(ns: NS, host: string): Server {
	const server: Server | undefined = getServerMap(ns).servers.find(s => s.characteristics.host === host)
	if (!server) throw new Error('Could not find that server.')
	return server
}

export function getHackableServers(ns: NS): HackableServer[] {
	return (getServerMap(ns).servers.filter(server => ServerUtils.isHackableServer(server)) as HackableServer[])
}

export function getCurrentTargets(ns: NS): HackableServer[] {
	return getHackableServers(ns)
		.filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETING)
}

export function getTargetServers(ns: NS): HackableServer[] {
	return getHackableServers(ns)
		.filter(server => server.isHackable(ns))
		.filter(server => server.isRooted(ns))
		.filter(server => server.staticHackingProperties.maxMoney > 0)
}

// We sort this descending
export function getPreppingServers(ns: NS): Server[] {
	return getServerMap(ns).servers
	                       .filter((server: Server) => server.isRooted(ns))
	                       .filter((server: Server) => server.purpose === ServerPurpose.PREP)
	                       .filter((server: Server) => server.purpose === ServerPurpose.PREP)
	                       .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

// We sort this descending
export function getHackingServers(ns: NS): Server[] {
	return getServerMap(ns).servers
	                       .filter((server: Server) => server.isRooted(ns))
	                       .filter((server: Server) => server.purpose === ServerPurpose.HACK)
	                       .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

export function addPreppingServer(ns: NS): void {

	// TODO: Make this return a boolean and log in the daemon script

	const purchasedServers: PurchasedServer[] = getPurchasedServers(ns, 'alphabetic')

	const numPrepServers: number = purchasedServers.filter((server) => server.hasPurpose(ServerPurpose.PREP)).length

	// We can't add any more prep servers
	if (numPrepServers >= ns.getPurchasedServerLimit() - MIN_NUMBER_PURPOSED_SERVERS) return

	const newPrepServer: PurchasedServer | undefined = purchasedServers.reverse()
	                                                                   .find((server) => server.hasPurpose(ServerPurpose.HACK))

	if (!newPrepServer) return

	setPurpose(ns, newPrepServer.characteristics.host, ServerPurpose.PREP)

	LogAPI.log(ns, `Changed purchased server ${newPrepServer.characteristics.host} to prep`)
}

export function addHackingServer(ns: NS): void {

	// TODO: Make this return a boolean and log in the daemon script

	const purchasedServers: PurchasedServer[] = getPurchasedServers(ns, 'alphabetic')

	const numHackServers: number = purchasedServers.filter((server) => server.hasPurpose(ServerPurpose.HACK)).length

	// We can't add any more prep servers
	if (numHackServers >= ns.getPurchasedServerLimit() - MIN_NUMBER_PURPOSED_SERVERS) return

	const newHackServer: PurchasedServer | undefined = purchasedServers.find((server) => server.hasPurpose(ServerPurpose.PREP))

	if (!newHackServer) return

	setPurpose(ns, newHackServer.characteristics.host, ServerPurpose.HACK)

	LogAPI.log(ns, `Changed purchased server ${newHackServer.characteristics.host} to hack`)
}

// We sort this ascending
export function getPurchasedServers(ns: NS, sortBy: ServerSortingOrder = 'ram'): PurchasedServer[] {
	const purchasedServers: PurchasedServer[] = getServerMap(ns).servers
	                                                            .filter((server: Server) => ServerUtils.isPurchasedServer(server)) as PurchasedServer[]

	if (sortBy === 'alphabetic') return purchasedServers.sort((a, b) => a.characteristics.purchasedServerId - b.characteristics.purchasedServerId)
	else if (sortBy === 'ram') return purchasedServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns))
	else throw new Error('Unknown sorting order')

}

export function isServerMapInitialized(ns: NS): boolean {
	try {
		const currentServerMap: ServerMap = readServerMap(ns)

		const lastAugTime: Date = new Date(Date.now() - ns.getTimeSinceLastAug())

		// We have updated the server map file already, so we can stop now
		return (lastAugTime <= currentServerMap.lastUpdated)

	} catch (e) {
		return false
	}
}

export async function initializeServerMap(ns: NS): Promise<void> {
	const pid: number = ns.run('/src/runners/ServerMapRunner.js')

	// TODO: Change this so that it logs or something
	if (pid === 0) throw new Error('Cannot start the ServerMapRunner')

	// Wait until the server map runner has finished
	while (ns.isRunning(pid)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}

	return
}