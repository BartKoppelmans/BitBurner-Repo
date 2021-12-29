import Batch          from '/src/classes/Job/Batch.js'
import { JobMap }     from '/src/classes/Job/JobInterfaces.js'
import { CONSTANT }   from '/src/lib/constants.js'
import HackableServer from '/src/classes/Server/HackableServer.js'
import Job            from '/src/classes/Job/Job.js'

export class JobStorage {

	lastUpdated: Date = CONSTANT.EPOCH_DATE
	batches: Batch[]  = []

	public constructor(jobmap?: JobMap) {
		if (jobmap) {
			this.batches     = jobmap.batches
			this.lastUpdated = jobmap.lastUpdated
		}
	}

	public static isBatchFinished(batch: Batch): boolean {
		return batch.jobs.every((job) => job.finished)
	}

	public getJobMap(): JobMap {
		return {
			batches: this.batches,
			lastUpdated: this.lastUpdated,
		}
	}

	public addBatch(batch: Batch): void {
		this.batches.push(batch)
		this.processUpdate()
	}

	public removeBatch(batch: Batch): boolean {
		const index: number = this.batches.findIndex((b) => b.batchId === batch.batchId)
		if (index === -1) return false
		this.batches.splice(index, 1)
		this.processUpdate()
		return true
	}

	public setJobStatus(job: Job, finished: boolean): boolean {
		const batchIndex: number = this.batches.findIndex((b) => b.batchId === job.batchId)
		if (batchIndex === -1) return false

		const jobIndex: number = this.batches[batchIndex].jobs.findIndex((j) => j.id === job.id)
		if (jobIndex === -1) return false

		this.batches[batchIndex].jobs[jobIndex].finished = finished

		this.processUpdate()

		return true
	}

	public clear(): void {
		this.batches = []
		this.processUpdate()
	}

	public getServerBatch(server: HackableServer): Batch | null {
		const batch: Batch | undefined = this.batches.find((b) => b.target.characteristics.host === server.characteristics.host)
		if (!batch) return null

		return batch
	}

	private processUpdate(): void {
		this.lastUpdated = new Date()
	}
}