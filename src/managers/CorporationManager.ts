import type { BitBurner as NS } from 'Bitburner'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as Utils               from '/src/util/Utils.js'
import { Manager }              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'

const LOOP_DELAY: number = 1000 as const

class CorporationManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

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

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.printTerminal(ns, `Stopping the CorporationManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {


		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
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
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}