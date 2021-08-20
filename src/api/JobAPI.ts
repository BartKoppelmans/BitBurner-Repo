import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import Batch                                 from '/src/classes/Job/Batch.js'
import Job                                   from '/src/classes/Job/Job.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import { JobMap }                            from '/src/classes/Job/JobInterfaces.js'
import * as ServerAPI                        from '/src/api/ServerAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import * as ToolUtils                        from '/src/util/ToolUtils.js'
import * as SerializationUtils               from '/src/util/SerializationUtils.js'
import { ServerMap, ServerStatus }           from '/src/classes/Server/ServerInterfaces.js'
import Server                                from '/src/classes/Server/Server.js'

export function getJobMap(ns: NS): JobMap {
	return readJobMap(ns)
}

function readJobMap(ns: NS): JobMap {
	const jobMapString: string = ns.read(CONSTANT.JOB_MAP_FILENAME).toString()

	const jobMap: JobMap = JSON.parse(jobMapString)
	jobMap.lastUpdated   = new Date(jobMap.lastUpdated)

	const batches: Batch[] = Array.from(jobMap.batches)
	jobMap.batches         = []

	for (const batch of batches) {
		jobMap.batches.push(SerializationUtils.batchFromJSON(ns, batch))
	}

	return jobMap
}

export function clearJobMap(ns: NS): void {
	ns.clear(CONSTANT.JOB_MAP_FILENAME)
}

export function writeJobMap(ns: NS, jobMap: JobMap): void {
	// NOTE: Do we want to do this?
	jobMap.lastUpdated = new Date()
	ns.write(CONSTANT.JOB_MAP_FILENAME, JSON.stringify(jobMap), 'w')
}

export function startBatch(ns: NS, batch: Batch): void {
	// TODO: We should do some checking in here

	const isPrep: boolean = batch.jobs[0].isPrep

	ServerAPI.setStatus(ns, batch.target, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING)

	for (const job of batch.jobs) {
		startJob(ns, job)
	}

	writeBatch(ns, batch)
}

function startJob(ns: NS, job: Job): void {

	// TODO: We should do some checking in here

	job.execute(ns)

	job.onStart(ns)

	const threadSpread: Map<Server, number> = job.threadSpread
	for (const [server, threads] of threadSpread) {
		const reservation: number = threads * ToolUtils.getToolCost(ns, job.tool)
		ServerAPI.decreaseReservation(ns, server, reservation)
	}
}

export function finishJobs(ns: NS, jobs: Job[]): void {
	// NOTE: This function manually removes the jobs instead of using removeJob (for performance reasons)
	const jobMap: JobMap = getJobMap(ns)

	for (const finishedJob of jobs) {
		const batchIndex: number = jobMap.batches.findIndex((b) => b.batchId === finishedJob.batchId)
		if (batchIndex === -1) throw new Error(`Could not find the batch`)

		const jobIndex: number = jobMap.batches[batchIndex].jobs.findIndex((j) => j.id === finishedJob.id)
		if (jobIndex === -1) throw new Error('Could not find the job')

		jobMap.batches[batchIndex].jobs[jobIndex].finished = true

		finishedJob.onFinish(ns)
	}

	writeJobMap(ns, jobMap)
}

export function removeFinishedBatches(ns: NS): void {
	const jobMap: JobMap = getJobMap(ns)

	const finishedBatchIndices: number[] = []
	for (const [index, batch] of jobMap.batches.entries()) {
		const isBatchFinished: boolean = batch.jobs.every((j) => j.finished)
		if (isBatchFinished) {
			ServerAPI.setStatus(ns, batch.target, ServerStatus.NONE)
			finishedBatchIndices.push(index)
		}
	}

	for (const index of finishedBatchIndices.reverse()) {
		jobMap.batches.splice(index, 1)
	}

	writeJobMap(ns, jobMap)
}

export function writeBatch(ns: NS, batch: Batch): void {
	const jobMap: JobMap = getJobMap(ns)
	jobMap.batches.push(batch)
	writeJobMap(ns, jobMap)
}

export function getRunningProcesses(ns: NS): ProcessInfo[] {
	const serverMap: ServerMap            = ServerAPI.getServerMap(ns)
	const runningProcesses: ProcessInfo[] = []
	for (const server of serverMap.servers) {
		runningProcesses.push(...ns.ps(server.characteristics.host))
	}
	return runningProcesses
}

export function cancelAllJobs(ns: NS): void {

	const jobMap: JobMap = getJobMap(ns)

	for (const batch of jobMap.batches) {
		for (const job of batch.jobs) {
			cancelJob(ns, job)
		}
	}

	// TODO: Check whether there are still jobs left that are not cancelled
}

export function cancelJob(ns: NS, job: Job): void {
	// TODO: We should do some checking here

	if (job.finished) return // The job has already finished so meh

	if (job.pids.length === 0) throw new Error('Cannot cancel a job without the pids')

	let allKilled: boolean = true
	for (const pid of job.pids) {
		const processKilled: boolean = ns.kill(pid)
		allKilled                    = allKilled && processKilled
	}

	job.onCancel(ns)

	if (!allKilled) LogAPI.warn(ns, 'Failed to cancel all jobs')
}

export function initializeJobMap(ns: NS): void {
	const jobMap: JobMap = { lastUpdated: new Date(), batches: [] }

	writeJobMap(ns, jobMap)
}