import type { BitBurner as NS } from 'Bitburner'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import Job                      from '/src/classes/Job/Job.js'
import { IBatch }               from '/src/classes/Job/JobInterfaces.js'
import { Cycle, CycleTask }     from '/src/classes/Misc/HackInterfaces.js'

export default class Batch {

	batchId: string
	target: HackableServer
	jobs: Job[]
	start: Date
	end: Date

	public constructor(ns: NS, batch: IBatch) {
		this.target  = batch.target
		this.batchId = batch.batchId
		this.start   = batch.start
		this.end     = batch.end
		this.jobs    = batch.jobs.sort((a, b) => a.end.getTime() - b.end.getTime())
	}

	public getCycles(): Cycle[] {
		const cycles: Map<string, Partial<Cycle>> = new Map<string, Cycle>()
		for (const job of this.jobs) {
			if (!job.cycleId) throw new Error('The batch is not an attack batch.')

			const currentCycle: Partial<Cycle> | undefined=  (cycles.has(job.cycleId)) ? cycles.get(job.cycleId) : {};
			if (!currentCycle) throw new Error('The fuck happened here?')

			if (job.cycleTask === CycleTask.HACK) currentCycle.hack = job
			if (job.cycleTask === CycleTask.WEAKEN1) currentCycle.weaken1 = job
			if (job.cycleTask === CycleTask.GROWTH) currentCycle.growth = job
			if (job.cycleTask === CycleTask.WEAKEN2) currentCycle.weaken2 = job

			cycles.set(job.cycleId, currentCycle)
		}

		return Array.from(cycles.values()) as Cycle[]
	}

	public getNumFinishedCycles(): number {
		const cycles: Cycle[] = this.getCycles()
		return cycles.reduce((total, cycle) => {
			if (cycle.hack.finished && cycle.weaken1.finished && cycle.growth.finished && cycle.weaken2.finished) {
				return total + 1
			} else return total
		}, 0)
	}

	public getNumCycles(): number {
		return this.jobs.length / 4
	}

	public toJSON() {
		return {
			batchId: this.batchId,
			target: this.target,
			jobs: this.jobs,
			start: this.start,
			end: this.end,
		}
	}

}