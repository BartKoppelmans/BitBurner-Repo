import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'

export async function main(ns: NS) {

	await ControlFlowAPI.killDaemon(ns)

	await ControlFlowAPI.killAllManagers(ns)

	// Clear the queue
	ControlFlowAPI.clearPorts(ns)

	ns.exit()
}