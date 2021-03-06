import type { NS, SleeveInformation, SleeveTask } from 'Bitburner'
import { SleeveSkills }                           from 'Bitburner'
import * as LogAPI                                from '/src/api/LogAPI.js'
import { SleeveTrainStat }                        from '/src/classes/Sleeve/SleeveInterfaces.js'

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

	public getStats(ns: NS): SleeveSkills {
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
		LogAPI.printLog(ns, `Set sleeve ${this.id} to synchronize`)
	}

	public setToTrain(ns: NS, stat: SleeveTrainStat): void {
		if (stat === SleeveTrainStat.NONE) return

		const task: SleeveTask = this.getTask(ns)
		if (task.gymStatType === stat) {
			return
		}

		ns.sleeve.setToGymWorkout(this.id, 'Powerhouse Gym', stat)
		LogAPI.printLog(ns, `Set sleeve ${this.id} to train ${stat}`)
	}

	public recoverShock(ns: NS): void {
		const task: SleeveTask = this.getTask(ns)
		if (task.task === 'Recovery') {
			return
		}

		ns.sleeve.setToShockRecovery(this.id)
		LogAPI.printLog(ns, `Set sleeve ${this.id} to recover from shock`)
	}

	public commitCrime(ns: NS, crime: string): void {
		const task: SleeveTask = this.getTask(ns)
		if (task.task === 'Crime' && task.crime === crime) {
			return
		}

		const isSuccessful: boolean = ns.sleeve.setToCommitCrime(this.id, crime)
		if (isSuccessful) LogAPI.printLog(ns, `Set sleeve ${this.id} to commit crime '${crime}'`)
		else LogAPI.printLog(ns, `Failed to set sleeve ${this.id} to commit crime '${crime}'`)
	}
}