import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as Utils               from '/src/util/Utils.js'
import { Manager }              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'

const LOOP_DELAY: number = 1000 as const

class CorporationManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		await CorporationManager.createCorporation(ns)
	}

	private static async createCorporation(ns: NS): Promise<void> {
		// TODO: Not possible yet
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the CorporationManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.debug(ns, `Stopping the CorporationManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {


		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/CorporationManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/CorporationManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: CorporationManager = new CorporationManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}