import type { NS }             from 'Bitburner'
import HackableServer          from '/src/classes/Server/HackableServer.js'
import Server                  from '/src/classes/Server/Server.js'
import {
	ServerMap,
	ServerPurpose,
	ServerSortingOrder,
	ServerStatus,
	ServerType,
}                              from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }            from '/src/lib/constants.js'
import * as ServerUtils        from '/src/util/ServerUtils.js'
import * as SerializationUtils from '/src/util/SerializationUtils.js'
import * as LogAPI             from '/src/api/LogAPI.js'
import {
	PurchasedServer,
}                              from '/src/classes/Server/PurchasedServer.js'
import {
	HacknetServer,
}                              from '/src/classes/Server/HacknetServer.js'
import {
	RamSpread,
}                              from '/src/classes/Misc/HackInterfaces.js'

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

export function getLastUpdated(ns: NS): Date {
	return readServerMap(ns).lastUpdated
}

export async function writeServerMap(ns: NS, serverMap: ServerMap): Promise<void> {
	// NOTE: Do we want to do this?
	serverMap.lastUpdated = new Date()
	await ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w')
}

export async function updateServer(ns: NS, server: Server): Promise<void> {
	const serverMap: ServerMap = getServerMap(ns)
	const index: number        = serverMap.servers.findIndex((s) => s.characteristics.host === server.characteristics.host)

	if (index === -1) throw new Error('Could not find the server.')

	serverMap.servers[index] = server

	await writeServerMap(ns, serverMap)
}

export async function setPurpose(ns: NS, host: string, purpose: ServerPurpose, force: boolean = false): Promise<void> {
	const server: Server = getServerByName(ns, host)

	if (ServerUtils.isPurchasedServer(server) && server.quarantinedInformation.quarantined) {
		if (server.quarantinedInformation.originalPurpose === purpose) return
	} else if (server.purpose === purpose) return

	if (ServerUtils.isPurchasedServer(server) && !force) {
		if (server.quarantinedInformation.quarantined) {
			server.quarantinedInformation.originalPurpose = purpose
		} else server.purpose = purpose
	} else server.purpose = purpose

	await updateServer(ns, server)
}

export async function setStatus(ns: NS, host: string, status: ServerStatus): Promise<void> {
	const server: Server = getServerByName(ns, host)

	if (!ServerUtils.isHackableServer(server)) throw new Error('The server is not a hackable server')

	if (server.status === status) return

	server.status = status
	await updateServer(ns, server)
}

export async function addServer(ns: NS, server: Server): Promise<void> {
	const serverMap: ServerMap = getServerMap(ns)

	const serverAlreadyExists: boolean = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host)
	if (serverAlreadyExists) throw new Error('Cannot add a server that already exists in the list')

	serverMap.servers.push(server)

	await writeServerMap(ns, serverMap)
}

export function getServerUtilization(ns: NS, servers: Server[], serverPurpose?: ServerPurpose): number {

	if (servers.length === 0) throw new Error('No servers yet?')

	if (serverPurpose) servers = servers.filter((server) => server.purpose === serverPurpose)

	if (servers.length <= MIN_NUMBER_PURPOSED_SERVERS) return Infinity

	const utilized: number = servers.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0)
	const total: number    = servers.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0)

	return (utilized / total)
}

export async function quarantine(ns: NS, host: string, ram: number): Promise<void> {
	const server: Server = getServerByName(ns, host)

	if (!ServerUtils.isPurchasedServer(server)) throw new Error('Cannot quarantine a normal server')

	server.quarantinedInformation = { quarantined: true, ram, originalPurpose: server.purpose }
	server.purpose                = ServerPurpose.NONE

	await updateServer(ns, server)

	LogAPI.printTerminal(ns, `We put ${server.characteristics.host} into quarantine`)
}

export async function upgradeServer(ns: NS, host: string, ram: number): Promise<void> {
	const server: Server = getServerByName(ns, host)

	if (!ServerUtils.isPurchasedServer(server)) throw new Error('Cannot quarantine a normal server')

	// TODO: Do some checks here

	if (!server.canUpgrade(ns, ram)) throw new Error('Cannot upgrade the server.')

	// TODO: Perhaps we should check here again how much we can actually purchase

	const deletedServer: boolean = ns.deleteServer(host)
	if (!deletedServer) throw new Error(`Could not delete server ${host}`)

	const boughtServer: string = ns.purchaseServer(host, ram)
	if (boughtServer) {
		LogAPI.printTerminal(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`)
	} else throw new Error('Could not purchase the server again.')

	server.purpose                = PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId)
	server.quarantinedInformation = { quarantined: false }

	await updateServer(ns, server)
}

export async function increaseReservation(ns: NS, host: string, reservation: number): Promise<void> {
	const server: Server = getServerByName(ns, host)
	reservation          = Math.round(reservation * 100) / 100
	server.increaseReservation(ns, reservation)
	await updateServer(ns, server)
}

export async function decreaseReservations(ns: NS, ramSpread: RamSpread, serverMap: ServerMap = getServerMap(ns)): Promise<void> {
	for (const [host, ram] of ramSpread) {
		const serverIndex: number = serverMap.servers.findIndex((server) => server.characteristics.host === host)
		if (serverIndex === -1) throw new Error('We could not find the server in the server map')
		const reservation: number          = Math.round(ram * 100) / 100
		serverMap.servers[serverIndex].decreaseReservation(ns, reservation)
	}
	await writeServerMap(ns, serverMap)
}

export function getServer(ns: NS, id: string): Server {
	const server: Server | undefined = getServerMap(ns).servers.find(s => s.characteristics.id === id)
	if (!server) throw new Error('Could not find that server.')
	return server
}

export function getServerByName(ns: NS, host: string, serverMap: ServerMap = getServerMap(ns)): Server {
	const server: Server | undefined = serverMap.servers.find(s => s.characteristics.host === host)
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
	                       .sort((a, b) => {
		                       if (a.characteristics.type === ServerType.HacknetServer && b.characteristics.type === ServerType.HacknetServer) return b.getAvailableRam(ns) - a.getAvailableRam(ns)
		                       else if (a.characteristics.type === ServerType.HacknetServer) return 1
		                       else if (b.characteristics.type === ServerType.HacknetServer) return -1
		                       else return b.getAvailableRam(ns) - a.getAvailableRam(ns)
	                       })
}

// We sort this descending
export function getHackingServers(ns: NS): Server[] {
	return getServerMap(ns).servers
	                       .filter((server: Server) => server.isRooted(ns))
	                       .filter((server: Server) => server.purpose === ServerPurpose.HACK)
	                       .sort((a, b) => {
		                       if (a.characteristics.type === ServerType.HacknetServer && b.characteristics.type === ServerType.HacknetServer) return b.getAvailableRam(ns) - a.getAvailableRam(ns)
		                       else if (a.characteristics.type === ServerType.HacknetServer) return 1
		                       else if (b.characteristics.type === ServerType.HacknetServer) return -1
		                       else return b.getAvailableRam(ns) - a.getAvailableRam(ns)
	                       })
}

export async function moveServerPurpose(ns: NS, purpose: ServerPurpose, type: ServerType) {
	const otherPurpose: ServerPurpose = (purpose === ServerPurpose.HACK) ? ServerPurpose.PREP : ServerPurpose.HACK

	let servers: Server[]
	if (type === ServerType.HacknetServer) {
		servers = getHacknetServers(ns, 'alphabetic')
	} else if (type === ServerType.PurchasedServer) {
		servers = getPurchasedServers(ns, 'alphabetic')
	} else throw new Error(`Type ${type} not yet supported.`)

	const numPrepServers: number = servers.filter((server) => server.hasPurpose(ServerPurpose.PREP)).length
	const numHackServers: number = servers.filter((server) => server.hasPurpose(ServerPurpose.HACK)).length
	const numServers: number     = servers.length

	if (purpose === ServerPurpose.PREP && numServers - numHackServers <= MIN_NUMBER_PURPOSED_SERVERS) return
	else if (purpose === ServerPurpose.HACK && numServers - numPrepServers <= MIN_NUMBER_PURPOSED_SERVERS) return

	const movedServer: Server | undefined = servers.find((server) => server.hasPurpose(otherPurpose))

	if (!movedServer) return

	await setPurpose(ns, movedServer.characteristics.host, purpose)

	LogAPI.printLog(ns, `Changed server ${movedServer.characteristics.host} to ${purpose}`)
}

// We sort this ascending
export function getPurchasedServers(ns: NS, sortBy: ServerSortingOrder = 'ram'): PurchasedServer[] {
	const purchasedServers: PurchasedServer[] = getServerMap(ns).servers
	                                                            .filter((server: Server) => ServerUtils.isPurchasedServer(server)) as PurchasedServer[]

	if (sortBy === 'alphabetic') return purchasedServers.sort((a, b) => a.characteristics.purchasedServerId - b.characteristics.purchasedServerId)
	else if (sortBy === 'ram') return purchasedServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns))
	else throw new Error('Unknown sorting order')

}

// We sort this ascending
export function getHacknetServers(ns: NS, sortBy: ServerSortingOrder = 'ram'): HacknetServer[] {
	const hacknetServers: HacknetServer[] = getServerMap(ns).servers
	                                                        .filter((server: Server) => ServerUtils.isHacknetServer(server)) as HacknetServer[]

	if (sortBy === 'alphabetic') return hacknetServers.sort((a, b) => a.characteristics.hacknetServerId - b.characteristics.hacknetServerId)
	else if (sortBy === 'ram') return hacknetServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns))
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
		await ns.asleep(CONSTANT.SMALL_DELAY)
	}

	return
}