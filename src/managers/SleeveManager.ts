import type { BitBurner as NS, SleeveInformation, SleeveStats } from 'Bitburner'
import * as LogAPI                                              from '/src/api/LogAPI.js'
import * as Utils                                               from '/src/util/Utils.js'
import { Manager }                                              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                                             from '/src/lib/constants.js'
import Sleeve                                                   from '/src/classes/Sleeve/Sleeve.js'

const LOOP_DELAY: number = 1000 as const

class SleeveManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	private static manageSleeve(ns: NS, sleeve: Sleeve): void {
		const information: SleeveInformation = sleeve.getInformation(ns)
		const stats: SleeveStats             = sleeve.getStats(ns)

		if (stats.shock > 0) {
			return sleeve.recoverShock(ns)
			// TODO: Check whether mugging works better?
		}

		if (stats.sync < 100) {
			return sleeve.synchronize(ns)
		}

		// TODO: Buy augments if possible

		// TODO: Train first if stats are shit

		return sleeve.commitCrime(ns, 'homicide')
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the SleeveManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.printTerminal(ns, `Stopping the SleeveManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {

		const sleeves: Sleeve[] = Sleeve.getSleeves(ns)

		for (const sleeve of sleeves) {
			SleeveManager.manageSleeve(ns, sleeve)
		}

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: SleeveManager = new SleeveManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}