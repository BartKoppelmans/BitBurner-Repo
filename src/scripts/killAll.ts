import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import { LogType }              from '/src/api/LogAPI.js'

export async function main(ns: NS) {

	const flags = ns.flags([
		['force', false],
	])

	await ControlFlowAPI.killDaemon(ns)

	await ControlFlowAPI.killAllManagers(ns)

	// Clear the queue
	ControlFlowAPI.clearPorts(ns)

	if (flags.force) {
		await ControlFlowAPI.killAllScripts(ns)
	}

	LogAPI.log(ns, `Killed all scripts`, LogType.INFORMATION)

	ns.exit()
}