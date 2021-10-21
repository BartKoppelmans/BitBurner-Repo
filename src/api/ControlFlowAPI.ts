import type { BitBurner as NS } from 'Bitburner'
import { CONSTANT }             from '/src/lib/constants.js'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import { ServerMap }            from '/src/classes/Server/ServerInterfaces.js'
import { Managers }             from '/src/managers/Managers.js'

export function killDaemon(ns: NS): void {
	ns.scriptKill('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)
}

export function killAllManagers(ns: NS): void {
	for (const manager of Object.values(Managers)) {
		ns.scriptKill(manager, CONSTANT.HOME_SERVER_HOST)
	}
}

export function killAllScripts(ns: NS): void {
	const serverMap: ServerMap = ServerAPI.getServerMap(ns)

	for (const server of serverMap.servers) {
		if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST) continue
		ns.killall(server.characteristics.host)
	}

	ns.killall(CONSTANT.HOME_SERVER_HOST)
}