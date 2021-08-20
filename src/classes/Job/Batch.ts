import type { BitBurner as NS } from 'Bitburner'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import Job                      from '/src/classes/Job/Job.js'
import { IBatch }               from '/src/classes/Job/JobInterfaces.js'

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