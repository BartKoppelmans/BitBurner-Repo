import type { BitBurner as NS, Port, Serializable } from 'Bitburner'
import { CONSTANT }                                 from '/src/lib/constants.js'
import * as ServerAPI                               from '/src/api/ServerAPI.js'
import { ServerMap }                                from '/src/classes/Server/ServerInterfaces.js'

// TODO: Move this all to the daemon

export enum ControlFlowCode {
	KILL_MANAGERS = 'KILL_MANAGERS',
	KILL_DAEMON   = 'KILL_DAEMON',
}

export function hasDaemonKillRequest(ns: NS): boolean {
	const portContents: Serializable = ns.peek(CONSTANT.CONTROL_FLOW_PORT)
	if (portContents === 'NULL PORT DATA' || !portContents) return false

	return (portContents.toString() === ControlFlowCode.KILL_DAEMON)
}

export function hasManagerKillRequest(ns: NS): boolean {
	const portContents: Serializable = ns.peek(CONSTANT.CONTROL_FLOW_PORT)
	if (portContents === 'NULL PORT DATA' || !portContents) return false

	return (portContents.toString() === ControlFlowCode.KILL_MANAGERS)
}

export function clearPorts(ns: NS): void {
	const ports: Port[] = Array.from({ length: 20 }, (_, i) => i + 1) as Port[]
	for (const port of ports) {
		ns.clear(port)
	}
}

export async function killDaemon(ns: NS): Promise<void> {
	await ns.write(CONSTANT.CONTROL_FLOW_PORT, ControlFlowCode.KILL_DAEMON)
}

export async function killAllManagers(ns: NS): Promise<void> {
	await ns.write(CONSTANT.CONTROL_FLOW_PORT, ControlFlowCode.KILL_MANAGERS)
}

export function killAllScripts(ns: NS): void {
	const serverMap: ServerMap = ServerAPI.getServerMap(ns)

	for (const server of serverMap.servers) {
		if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST) continue
		ns.killall(server.characteristics.host)
	}

	ns.killall(CONSTANT.HOME_SERVER_HOST)
}