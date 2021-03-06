import Server              from '/src/classes/Server/Server.js'
import { ServerType }      from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }        from '/src/lib/constants.js'
import { PurchasedServer } from '/src/classes/Server/PurchasedServer.js'
import HackableServer      from '/src/classes/Server/HackableServer.js'
import { HacknetServer }   from '/src/classes/Server/HacknetServer.js'

export function isHomeServer(server: Server): boolean {
	return server.characteristics.type === ServerType.HomeServer
}

export function isPurchasedServer(server: Server): server is PurchasedServer {
	return server.characteristics.type === ServerType.PurchasedServer
}

export function isHackableServer(server: Server): server is HackableServer {
	return (server.characteristics.type === ServerType.HackableServer)
}


export function isHacknetServer(server: Server): server is HacknetServer {
	return server.characteristics.type === ServerType.HacknetServer
}

export function isDarkwebServer(server: Server): boolean {
	return server.characteristics.type === ServerType.DarkWebServer
}

export function isHome(host: string): boolean {
	return (host === CONSTANT.HOME_SERVER_HOST)
}

export function isPurchased(host: string): boolean {
	return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX)
}

export function isDarkweb(host: string): boolean {
	return (host === CONSTANT.DARKWEB_HOST)
}

export function isHacknet(host: string): boolean {
	return host.includes(CONSTANT.HACKNET_SERVER_PREFIX)
}