import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import { CONSTANT }             from '/src/lib/constants.js'

export async function main(ns: NS) {

	const flags = ns.flags([
		['force', false],
	])

	await ControlFlowAPI.killDaemon(ns)

	await ns.sleep(1000) // TODO: Move this to a constant

	// Clear the queue
	ControlFlowAPI.clearPorts(ns)

	while (ns.isRunning('src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}

	await ControlFlowAPI.killAllManagers(ns)

	await ns.sleep(1000) // TODO: Move this to a constant

	// Clear the queue
	ControlFlowAPI.clearPorts(ns)

	if (flags.force) {
		await ControlFlowAPI.killAllScripts(ns)
	}

	LogAPI.printTerminal(ns, `Killed all scripts`)

	ns.exit()
}