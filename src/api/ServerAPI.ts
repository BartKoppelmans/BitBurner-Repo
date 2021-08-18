import type { BitBurner as NS }                   from 'Bitburner'
import HackableServer                             from '/src/classes/Server/HackableServer.js'
import Server                                     from '/src/classes/Server/Server.js'
import { ServerMap, ServerPurpose, ServerStatus } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }                               from '/src/lib/constants.js'
import * as ServerUtils                           from '/src/util/ServerUtils.js'
import * as SerializationUtils                    from '/src/util/SerializationUtils.js'
import * as LogAPI                                from '/src/api/LogAPI.js'
import { LogType }                                from '/src/api/LogAPI.js'
import PurchasedServer                            from '/src/classes/Server/PurchasedServer.js'

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

export function setPurpose(ns: NS, server: Server, purpose: ServerPurpose): void {
	server.purpose = purpose

	updateServer(ns, server)
}

export function setStatus(ns: NS, server: Server, status: ServerStatus): void {
	if (!ServerUtils.isHackableServer(server)) throw new Error('The server is not a hackable server');
	(server as HackableServer).status = status
	updateServer(ns, server)
}

export function addServer(ns: NS, server: Server): void {
	const serverMap: ServerMap = getServerMap(ns)

	const serverAlreadyExists: boolean = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host)
	if (serverAlreadyExists) throw new Error('Cannot add a server that already exists in the list')

	serverMap.servers.push(server)

	writeServerMap(ns, serverMap)
}

export function quarantine(ns: NS, server: PurchasedServer, ram: number): void {
	server.purpose                = ServerPurpose.NONE
	server.quarantinedInformation = { quarantined: true, ram }

	updateServer(ns, server)

	LogAPI.log(ns, `We put ${server.characteristics.host} into quarantine`, LogType.PURCHASED_SERVER)
}

export function upgradeServer(ns: NS, server: PurchasedServer, ram: number): void {

	// TODO: Do some checks here

	if (!server.canUpgrade(ns, ram)) throw new Error('Cannot upgrade the server.')

	// TODO: Perhaps we should check here again how much we can actually purchase

	const deletedServer: boolean = ns.deleteServer(server.characteristics.host)
	if (!deletedServer) throw new Error(`Could not delete server ${server.characteristics.host}`)

	const boughtServer: string = ns.purchaseServer(server.characteristics.host, ram)
	if (boughtServer) {
		LogAPI.log(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`, LogType.PURCHASED_SERVER)
	} else throw new Error('Could not purchase the server again.')

	server.purpose                = PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId)
	server.quarantinedInformation = { quarantined: false }

	updateServer(ns, server)
}

export function increaseReservation(ns: NS, server: Server, reservation: number): void {
	reservation = Math.round(reservation * 100) / 100
	server.increaseReservation(ns, reservation)
	updateServer(ns, server)
}

export function decreaseReservation(ns: NS, server: Server, reservation: number): void {
	reservation = Math.round(reservation * 100) / 100
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
	                       .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

// We sort this descending
export function getHackingServers(ns: NS): Server[] {
	return getServerMap(ns).servers
	                       .filter((server: Server) => server.isRooted(ns))
	                       .filter((server: Server) => server.purpose === ServerPurpose.HACK)
	                       .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

// We sort this ascending
export function getPurchasedServers(ns: NS): PurchasedServer[] {
	const purchasedServers: PurchasedServer[] = getServerMap(ns).servers
	                                                            .filter((server: Server) => ServerUtils.isPurchasedServer(server)) as PurchasedServer[]
	return purchasedServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns))
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