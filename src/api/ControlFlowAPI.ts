import type { BitBurner as NS, Port } from 'Bitburner'
import { CONSTANT }                   from '/src/lib/constants.js'
import * as Utils                     from '/src/util/Utils.js'
import * as ServerAPI                 from '/src/api/ServerAPI.js'
import { ServerMap }                  from '/src/classes/Server/ServerInterfaces.js'

const MANAGER_KILL_DELAY: number = 2500 as const

// TODO: Move this all to the daemon

export enum ControlFlowCode {
	KILL_MANAGERS,
	KILL_DAEMON,
}

export interface ControlFlowRequest extends Request {
	id: string;
	code: ControlFlowCode;
}


export async function launchRunners(ns: NS): Promise<void> {
	const purchasedServerRunner: Promise<void> = launchRunner(ns, '/src/runners/PurchasedServerRunner.js')
	const programRunner: Promise<void>         = launchRunner(ns, '/src/runners/ProgramRunner.js')
	const codingContractRunner: Promise<void>  = launchRunner(ns, '/src/runners/CodingContractRunner.js')

	await Promise.allSettled([purchasedServerRunner, programRunner, codingContractRunner])
}

export async function launchRunner(ns: NS, script: string): Promise<void> {

	// TODO: Check if we have enough ram available to run

	const pid: number = ns.run(script)

	while (ns.isRunning(pid)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function hasDaemonKillRequest(ns: NS): boolean {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
	if (requestPortHandle.empty()) return false

	// We only peek, as we want to be sure that we have a request for the daemon
	const request: ControlFlowRequest = JSON.parse(requestPortHandle.peek().toString())

	if (request.code === ControlFlowCode.KILL_DAEMON) {

		// Remove the request from the queue
		requestPortHandle.read()

		return true
	} else return false
}

export function hasManagerKillRequest(ns: NS): boolean {
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)
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
	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)

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

	while (isDaemonRunning(ns)) {
		await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY)
	}
}

export async function killAllManagers(ns: NS): Promise<void> {

	// TODO: Perhaps move this to each API individually? Then we also know which one failed.

	const requestPortHandle: any = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT)

	while (requestPortHandle.full()) {
		await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME)
	}

	const id: string = Utils.generateHash()

	requestPortHandle.write(JSON.stringify({
		code: ControlFlowCode.KILL_MANAGERS,
		type: 'Request',
		id,
	}))

	// TODO: We just add a delay and pray that it has finished by then

	await ns.sleep(MANAGER_KILL_DELAY)
}

export function killAllScripts(ns: NS): void {
	const serverMap: ServerMap = ServerAPI.getServerMap(ns)

	for (const server of serverMap.servers) {
		if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST) continue
		ns.killall(server.characteristics.host)
	}

	ns.killall(CONSTANT.HOME_SERVER_HOST)
}

function isDaemonRunning(ns: NS): boolean {
	return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)
}