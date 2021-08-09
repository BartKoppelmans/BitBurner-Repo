import type { BitBurner as NS, Port }          from 'Bitburner'
import * as CodingContractAPI                  from '/src/api/CodingContractAPI.js'
import * as JobAPI                             from '/src/api/JobAPI.js'
import * as LogAPI                             from '/src/api/LogAPI.js'
import * as ProgramAPI                         from '/src/api/ProgramAPI.js'
import { ControlFlowCode, ControlFlowRequest } from '/src/interfaces/PortMessageInterfaces.js'
import { CONSTANT }                            from '/src/lib/constants.js'
import * as Utils                              from '/src/util/Utils.js'

export async function launchRunners(ns: NS): Promise<void> {

	// TODO: Check if we have enough ram available to run

	// TODO: Launch the coding contract runner
	// TODO: Launch the program runner

	const purchasedServerRunnerPid: number = ns.run('/src/runners/PurchasedServerRunner.js')

	// TODO: Wait until everything is finished
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

	while (true) {

		if (!areManagersRunning(ns)) return

		await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY)
	}
}

function areRunnersRunning(ns: NS): boolean {
	// TODO: Implement this
	return false
}

function areManagersRunning(ns: NS): boolean {
	return (
		JobAPI.isJobManagerRunning(ns) ||
		ProgramAPI.isProgramManagerRunning(ns) || // TODO: Remove this
		CodingContractAPI.isCodingContractManagerRunning(ns) || // TODO: Remove this
		LogAPI.isLogManagerRunning(ns) // TODO: Remove this
	)
}

function isDaemonRunning(ns: NS): boolean {
	return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)
}