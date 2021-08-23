import type { BitBurner as NS } from 'Bitburner'
import * as ControlFlowAPI      from '/src/api/ControlFlowAPI.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as Utils               from '/src/util/Utils.js'
import { Manager }              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'

const MANAGING_LOOP_DELAY: number = 1000 as const

class GangManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the GangManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.debug(ns, `Stopping the GangManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {
		// Do something
	}
}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: GangManager = new GangManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}