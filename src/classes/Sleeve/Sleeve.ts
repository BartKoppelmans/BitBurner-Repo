import type { BitBurner as NS, Crime, SleeveInformation, SleeveStats, SleeveTask } from 'Bitburner'
import * as LogAPI                                                                 from '/src/api/LogAPI.js'

export default class Sleeve {

	id: number

	public constructor(ns: NS, id: number) {
		this.id = id
	}

	public static getSleeves(ns: NS): Sleeve[] {
		const numSleeves: number = ns.sleeve.getNumSleeves()
		const sleeves: Sleeve[]  = []

		for (let i = 0; i < numSleeves; i++) {
			sleeves.push(new Sleeve(ns, i))
		}
		return sleeves
	}

	public getInformation(ns: NS): SleeveInformation {
		return ns.sleeve.getInformation(this.id)
	}

	public getStats(ns: NS): SleeveStats {
		return ns.sleeve.getSleeveStats(this.id)
	}

	public getTask(ns: NS): SleeveTask {
		return ns.sleeve.getTask(this.id)
	}

	public synchronize(ns: NS): void {
		const task: SleeveTask = this.getTask(ns)
		if (task.task === 'Synchro') {
			return
		}


		ns.sleeve.setToSynchronize(this.id)
		LogAPI.log(ns, `Set sleeve ${this.id} to synchronize`)
	}

	public recoverShock(ns: NS): void {
		const task: SleeveTask = this.getTask(ns)
		if (task.task === 'Recovery') {
			return
		}

		ns.sleeve.setToShockRecovery(this.id)
		LogAPI.log(ns, `Set sleeve ${this.id} to recover from shock`)
	}

	public commitCrime(ns: NS, crime: Crime): void {
		const task: SleeveTask = this.getTask(ns)
		if (task.task === 'Crime' && task.crime === crime) {
			return
		}

		const isSuccessful: boolean = ns.sleeve.setToCommitCrime(this.id, crime)
		if (isSuccessful) LogAPI.log(ns, `Set sleeve ${this.id} to commit crime '${crime}'`)
		else LogAPI.warn(ns, `Failed to set sleeve ${this.id} to commit crime '${crime}'`)
	}
}