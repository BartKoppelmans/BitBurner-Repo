import type { BitBurner as NS, Port } from 'Bitburner'
import { CONSTANT }                   from '/src/lib/constants.js'
import * as ServerAPI                 from '/src/api/ServerAPI.js'
import { ServerMap }                  from '/src/classes/Server/ServerInterfaces.js'

// TODO: Move this all to the daemon

export enum ControlFlowCode {
	KILL_MANAGERS = 'KILL_MANAGERS',
	KILL_DAEMON   = 'KILL_DAEMON',
}


export function hasDaemonKillRequest(ns: NS): boolean {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	if (requestPortHandle.empty()) return false

	// We only peek, as we want to be sure that we have a request for the daemon
	const request: ControlFlowCode = requestPortHandle.peek().toString()

	if (request === ControlFlowCode.KILL_DAEMON) {

		// Remove the request from the queue
		requestPortHandle.read()

		return true
	} else return false
}

export function hasManagerKillRequest(ns: NS): boolean {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	if (requestPortHandle.empty()) return false

	// We only peek, as we want to be sure that we have a request for the daemon
	const request: ControlFlowCode = requestPortHandle.peek().toString()

	return (request === ControlFlowCode.KILL_MANAGERS)
}

export function clearPorts(ns: NS): void {
	const ports: Port[] = Array.from({ length: 20 }, (_, i) => i + 1) as Port[]
	for (const port of ports) {
		ns.getPortHandle(port).clear()
	}
}

export function killDaemon(ns: NS): void {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	requestPortHandle.write(ControlFlowCode.KILL_DAEMON)
}

export function killAllManagers(ns: NS): void {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	requestPortHandle.write(ControlFlowCode.KILL_MANAGERS)
}

export function killAllScripts(ns: NS): void {
	const serverMap: ServerMap = ServerAPI.getServerMap(ns)

	for (const server of serverMap.servers) {
		if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST) continue
		ns.killall(server.characteristics.host)
	}

	ns.killall(CONSTANT.HOME_SERVER_HOST)
}