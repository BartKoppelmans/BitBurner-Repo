import type { BitBurner as NS, Port } from 'Bitburner'
import { CONSTANT }                   from '/src/lib/constants.js'
import * as Utils                     from '/src/util/Utils.js'
import * as ServerAPI                 from '/src/api/ServerAPI.js'
import { ServerMap }                  from '/src/classes/Server/ServerInterfaces.js'

const MANAGER_KILL_DELAY: number = 5000 as const

export enum ControlFlowCode {
	KILL_MANAGERS,
	KILL_DAEMON,
}

export interface ControlFlowRequest extends Request {
	id: string;
	code: ControlFlowCode;
}


export async function launchRunners(ns: NS): Promise<void> {

	// TODO: Check if we have enough ram available to run

	const purchasedServerRunnerPid: number = ns.run('/src/runners/PurchasedServerRunner.js')
	const programRunnerPid: number         = ns.run('/src/runners/ProgramRunner.js')
	const codingContractRunnerPid: number  = ns.run('/src/runners/CodingContractRunner.js')

	while (ns.isRunning(purchasedServerRunnerPid) || ns.isRunning(programRunnerPid) || ns.isRunning(codingContractRunnerPid)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export async function hasDaemonKillRequest(ns: NS): Promise<boolean> {
	const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	if (requestPortHandle.empty()) return false

	// We only peek, as we want to be sure that we have a request for the daemon
	const request: ControlFlowRequest = JSON.parse(requestPortHandle.peek().toString())

	if (request.code === ControlFlowCode.KILL_DAEMON) {

		// Remove the request from the queue
		requestPortHandle.read()

		return true
	} else return false
}

export async function hasManagerKillRequest(ns: NS): Promise<boolean> {
	const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	if (requestPortHandle.empty()) return false

	// We only peek, as we want to wait until daemon finishes first if that is a request
	const request: ControlFlowRequest = JSON.parse(requestPortHandle.peek().toString())

	return (request.code === ControlFlowCode.KILL_MANAGERS)
}

export function clearPorts(ns: NS): void {
	const ports: Port[] = Array.from({ length: 20 }, (_, i) => i + 1) as Port[]
	for (const port of ports) {
		ns.getPortHandle(port).clear()
	}
}

export async function killDaemon(ns: NS): Promise<void> {
	const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)

	while (requestPortHandle.full()) {
		await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME)
	}

	const id: string = Utils.generateHash()

	requestPortHandle.write(JSON.stringify({
		code: ControlFlowCode.KILL_DAEMON,
		type: 'Request',
		id,
	}))

	// TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run

	while (true) {

		if (!isDaemonRunning(ns)) return

		await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY)
	}
}

export async function killAllManagers(ns: NS): Promise<void> {

	// TODO: Perhaps move this to each API individually? Then we also know which one failed.

	const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)

	while (requestPortHandle.full()) {
		await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME)
	}

	const id: string = Utils.generateHash()

	requestPortHandle.write(JSON.stringify({
		code: ControlFlowCode.KILL_MANAGERS,
		type: 'Request',
		id,
	}))

	// TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run

	await ns.sleep(MANAGER_KILL_DELAY)
}

export async function killAllScripts(ns: NS): Promise<void> {
	const serverMap: ServerMap = await ServerAPI.getServerMap(ns)

	for (const server of serverMap.servers) {
		if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST) continue

		ns.killall(server.characteristics.host)
	}

	ns.killall(CONSTANT.HOME_SERVER_HOST)
}

function isDaemonRunning(ns: NS): boolean {
	return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)
}