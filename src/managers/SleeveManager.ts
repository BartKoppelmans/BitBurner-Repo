import type { BitBurner as NS, SleeveInformation, SleeveStats } from 'Bitburner'
import * as ControlFlowAPI                                      from '/src/api/ControlFlowAPI.js'
import * as LogAPI                                              from '/src/api/LogAPI.js'
import * as Utils                                               from '/src/util/Utils.js'
import { Manager }                                              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                                             from '/src/lib/constants.js'
import Sleeve                                                   from '/src/classes/Sleeve/Sleeve.js'

const LOOP_DELAY: number = 10000 as const

class SleeveManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	private sleeves!: Sleeve[]

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		this.sleeves = Sleeve.getSleeves(ns)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the SleeveManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.debug(ns, `Stopping the SleeveManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {

		for (const sleeve of this.sleeves) {
			SleeveManager.manageSleeve(ns, sleeve)
		}

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	private static manageSleeve(ns: NS, sleeve: Sleeve): void {
		const information: SleeveInformation = sleeve.getInformation(ns)
		const stats: SleeveStats             = sleeve.getStats(ns)

		if (stats.shock > 0) {
			return sleeve.recoverShock(ns)
		}

		if (stats.sync < 100) {
			return sleeve.synchronize(ns)
		}

		return sleeve.commitCrime(ns, 'Homicide')
	}

}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/SleeveManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/SleeveManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: SleeveManager = new SleeveManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}