import type { BitBurner as NS, SleeveInformation, SleeveStats } from 'Bitburner'
import * as LogAPI                                              from '/src/api/LogAPI.js'
import * as Utils                                               from '/src/util/Utils.js'
import { Manager }                                              from '/src/classes/Misc/ScriptInterfaces.js'
import Sleeve                                                   from '/src/classes/Sleeve/Sleeve.js'
import { SleeveTrainStat }                                      from '/src/classes/Sleeve/SleeveInterfaces.js'

const LOOP_DELAY: number = 10000 as const
const STAT_MUG_THRESHOLD: number = 25 as const
const STAT_HOMICIDE_THRESHOLD: number = 100 as const

class SleeveManager implements Manager {

	private static shouldTrain(ns: NS, stats: SleeveStats): SleeveTrainStat {
		if (stats.strength < STAT_MUG_THRESHOLD) return SleeveTrainStat.STRENGTH
		else if (stats.defense < STAT_MUG_THRESHOLD) return SleeveTrainStat.DEFENSE
		else if (stats.dexterity < STAT_MUG_THRESHOLD) return SleeveTrainStat.DEXTERITY
		else if (stats.agility < STAT_MUG_THRESHOLD) return SleeveTrainStat.AGILITY
		else return SleeveTrainStat.NONE
	}

	private static shouldMug(ns: NS, stats: SleeveStats): boolean {
		return stats.strength < STAT_HOMICIDE_THRESHOLD ||
			stats.defense < STAT_HOMICIDE_THRESHOLD ||
			stats.dexterity < STAT_HOMICIDE_THRESHOLD ||
			stats.agility < STAT_HOMICIDE_THRESHOLD
	}

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
		const trainStat: SleeveTrainStat = SleeveManager.shouldTrain(ns, stats)
		if (trainStat !== SleeveTrainStat.NONE) {
			return sleeve.setToTrain(ns, trainStat)
		}

		if (SleeveManager.shouldMug(ns, stats)) {
			return sleeve.commitCrime(ns, 'mug')
		}

		return sleeve.commitCrime(ns, 'homicide')
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the SleeveManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Stopping the SleeveManager`)
	}

	public async managingLoop(ns: NS): Promise<void> {
		const sleeves: Sleeve[] = Sleeve.getSleeves(ns)

		for (const sleeve of sleeves) {
			SleeveManager.manageSleeve(ns, sleeve)
		}
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
		await instance.managingLoop(ns)
		await ns.sleep(LOOP_DELAY)
	}
}