import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import { CONSTANT }             from '/src/lib/constants.js'

export async function main(ns: NS) {

	const flags = ns.flags([
		['force', false],
	])

	ControlFlowAPI.killDaemon(ns)

	while (ns.isRunning('src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}

	ControlFlowAPI.killAllManagers(ns)

	await ns.sleep(1000) // TODO: Change this to wait for the managers to not be running

	if (flags.force) {
		await ControlFlowAPI.killAllScripts(ns)
	}

	LogAPI.printTerminal(ns, `Killed all scripts`)

	ns.exit()
}