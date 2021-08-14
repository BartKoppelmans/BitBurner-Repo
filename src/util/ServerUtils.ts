import Server         from '/src/classes/Server/Server.js'
import { ServerType } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }   from '/src/lib/constants.js'

export function isHomeServer(server: Server): boolean {
	return server.characteristics.type === ServerType.HomeServer
}

export function isPurchasedServer(server: Server): boolean {
	return server.characteristics.type === ServerType.PurchasedServer
}

export function isHackableServer(server: Server): boolean {
	return (server.characteristics.type === ServerType.HackableServer)
}

export function isDarkwebServer(server: Server) {
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