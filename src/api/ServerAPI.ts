import type { BitBurner as NS } from 'Bitburner'
import HackableServer           from '/src/classes/HackableServer.js'
import Server                   from '/src/classes/Server.js'
import {
	HackableServerList,
	PurchasedServerList,
	ServerList,
	ServerMap,
	ServerPurpose,
	ServerStatus,
}                               from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'
import * as ServerUtils         from '/src/util/ServerUtils.js'
import * as SerializationUtils  from '/src/util/SerializationUtils.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import { LogMessageCode }       from '/src/interfaces/PortMessageInterfaces.js'
import PurchasedServer          from '/src/classes/PurchasedServer.js'

export async function getServerMap(ns: NS): Promise<ServerMap> {
	return await readServerMap(ns)
}

async function readServerMap(ns: NS): Promise<ServerMap> {

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

export async function clearServerMap(ns: NS): Promise<void> {
	ns.clear(CONSTANT.SERVER_MAP_FILENAME)
}

export async function writeServerMap(ns: NS, serverMap: ServerMap): Promise<void> {
	// NOTE: Do we want to do this?
	serverMap.lastUpdated = new Date()
	ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w')
}

export async function updateServer(ns: NS, server: Server): Promise<void> {
	const serverMap: ServerMap = await getServerMap(ns)
	const index: number        = serverMap.servers.findIndex((s) => s.characteristics.host === server.characteristics.host)

	if (index === -1) throw new Error('Could not find the server.')

	serverMap.servers[index] = server

	await writeServerMap(ns, serverMap)
}

export async function setPurpose(ns: NS, server: Server, purpose: ServerPurpose): Promise<void> {
	server.setPurpose(purpose)

	await updateServer(ns, server)
}

export async function setStatus(ns: NS, server: Server, status: ServerStatus): Promise<void> {
	if (!ServerUtils.isHackableServer(server)) throw new Error('The server is not a hackable server');

	(server as HackableServer).setStatus(status)

	await updateServer(ns, server)
}

export async function getNewId(ns: NS): Promise<number> {
	const idList: number[] = (await getServerMap(ns)).servers.map((s) => s.characteristics.id).sort()
	return idList[idList.length - 1] + 1
}

export async function addServer(ns: NS, server: Server): Promise<void> {
	const serverMap: ServerMap = await getServerMap(ns)

	const serverAlreadyExists: boolean = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host)
	if (serverAlreadyExists) throw new Error('Cannot add a server that already exists in the list')

	serverMap.servers.push(server)

	await writeServerMap(ns, serverMap)
}

export async function quarantine(ns: NS, server: PurchasedServer, ram: number): Promise<void> {
	server.setPurpose(ServerPurpose.NONE)
	server.quarantinedInformation = { quarantined: true, ram }

	await updateServer(ns, server)

	await LogAPI.log(ns, `We put ${server.characteristics.host} into quarantine`, true, LogMessageCode.PURCHASED_SERVER)
}

export async function upgradeServer(ns: NS, server: PurchasedServer, ram: number): Promise<void> {

	// TODO: Do some checks here

	if (!server.canUpgrade(ns, ram)) throw new Error('Cannot upgrade the server.')

	// TODO: Perhaps we should check here again how much we can actually purchase

	const deletedServer: boolean = ns.deleteServer(server.characteristics.host)
	if (!deletedServer) throw new Error(`Could not delete server ${server.characteristics.host}`)

	const boughtServer: string = ns.purchaseServer(server.characteristics.host, ram)
	if (boughtServer) {
		await LogAPI.log(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`, true, LogMessageCode.PURCHASED_SERVER)
	} else throw new Error('Could not purchase the server again.')

	server.setPurpose(PurchasedServer.determinePurpose(server.characteristics.purchasedServerId))
	server.quarantinedInformation = { quarantined: false }

	await updateServer(ns, server)
}

export async function setReservation(ns: NS, server: Server, reservation: number): Promise<void> {
	server.setReservation(reservation)

	await updateServer(ns, server)
}

export async function increaseReservation(ns: NS, server: Server, reservation: number): Promise<void> {
	server.increaseReservation(ns, reservation)

	await updateServer(ns, server)

}

export async function decreaseReservation(ns: NS, server: Server, reservation: number): Promise<void> {
	server.decreaseReservation(ns, reservation)

	await updateServer(ns, server)
}

export async function getServer(ns: NS, id: number): Promise<Server> {
	const server: Server | undefined = (await getServerMap(ns)).servers.find(s => s.characteristics.id === id)

	if (!server) throw new Error('Could not find that server.')

	return server
}

export async function getHackableServers(ns: NS): Promise<HackableServerList> {
	return ((await getServerMap(ns)).servers.filter(server => ServerUtils.isHackableServer(server)) as HackableServerList)
}

export async function getCurrentTargets(ns: NS): Promise<HackableServerList> {
	return (await getHackableServers(ns))
		.filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETING)
}

export async function getTargetServers(ns: NS): Promise<HackableServerList> {
	return (await getHackableServers(ns))
		.filter(server => server.isHackable(ns))
		.filter(server => server.isRooted(ns))
		.filter(server => server.staticHackingProperties.maxMoney > 0)
}

// We sort this descending
export async function getPreppingServers(ns: NS): Promise<ServerList> {
	return (await getServerMap(ns)).servers
	                               .filter((server: Server) => server.isRooted(ns))
	                               .filter((server: Server) => server.purpose === ServerPurpose.PREP)
	                               .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

// We sort this descending
export async function getHackingServers(ns: NS): Promise<ServerList> {
	return (await getServerMap(ns)).servers
	                               .filter((server: Server) => server.isRooted(ns))
	                               .filter((server: Server) => server.purpose === ServerPurpose.HACK)
	                               .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns))
}

// We sort this ascending
export async function getPurchasedServers(ns: NS): Promise<PurchasedServerList> {
	return ((await getServerMap(ns)).servers
	                                .filter((server: Server) => ServerUtils.isPurchasedServer(server)) as PurchasedServerList)
		.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns))
}

export async function isServerMapInitialized(ns: NS): Promise<boolean> {
	try {
		const currentServerMap: ServerMap = await readServerMap(ns)

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