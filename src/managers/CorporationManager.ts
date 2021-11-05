import type { NS } from 'Bitburner'
import * as LogAPI from '/src/api/LogAPI.js'
import * as Utils  from '/src/util/Utils.js'
import { Manager } from '/src/classes/Misc/ScriptInterfaces.js'

const LOOP_DELAY: number = 1000 as const

class CorporationManager implements Manager {

	private static async createCorporation(ns: NS): Promise<void> {
		// TODO: Not possible yet
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		await CorporationManager.createCorporation(ns)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the CorporationManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Stopping the CorporationManager`)
	}

	public async managingLoop(ns: NS): Promise<void> {
		return
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: CorporationManager = new CorporationManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await instance.managingLoop(ns)
		await ns.asleep(LOOP_DELAY)
	}
}