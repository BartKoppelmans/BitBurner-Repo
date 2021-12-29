import type { ActiveFragment, NS } from 'Bitburner'
import * as LogAPI                 from '/src/api/LogAPI.js'
import * as Utils                  from '/src/util/Utils.js'
import { Manager }                 from '/src/classes/Misc/ScriptInterfaces.js'

const LOOP_DELAY: number = 1000 as const

class StanekManager implements Manager {

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the StanekManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Stopping the StanekManager`)
	}

	public async managingLoop(ns: NS): Promise<void> {

		const fragments: ActiveFragment[] = ns.stanek.activeFragments().sort((a, b) => a.numCharge - b.numCharge)

		const lowestCharged: ActiveFragment = fragments[0]
		await ns.stanek.charge(lowestCharged.x, lowestCharged.y)

		return
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: StanekManager = new StanekManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await instance.managingLoop(ns)
		await ns.asleep(LOOP_DELAY)
	}
}