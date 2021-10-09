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
import { ThreadSpread }                      from '/src/classes/Misc/HackInterfaces.js'

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

export async function writeJobMap(ns: NS, jobMap: JobMap): Promise<void> {
	// NOTE: Do we want to do this?
	jobMap.lastUpdated = new Date()
	await ns.write(CONSTANT.JOB_MAP_FILENAME, JSON.stringify(jobMap), 'w')
}

export async function startBatch(ns: NS, batch: Batch): Promise<void> {
	// TODO: We should do some checking in here

	const isPrep: boolean = batch.jobs[0].isPrep

	await ServerAPI.setStatus(ns, batch.target.characteristics.host, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING)

	for (const job of batch.jobs) {
		await startJob(ns, job)
	}

	await writeBatch(ns, batch)
}

async function startJob(ns: NS, job: Job): Promise<void> {

	// TODO: We should do some checking in here

	job.execute(ns)

	job.onStart(ns)

	const threadSpread: ThreadSpread = job.threadSpread
	for (const [server, threads] of threadSpread) {
		const reservation: number = threads * (await ToolUtils.getToolCost(ns, job.tool))
		await ServerAPI.decreaseReservation(ns, server, reservation)
	}
}

export async function finishJobs(ns: NS, jobs: Job[]): Promise<void> {
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

	const finishedBatchIndices: number[] = []
	for (const [index, batch] of jobMap.batches.entries()) {
		const isBatchFinished: boolean = batch.jobs.every((j) => j.finished)
		if (isBatchFinished) {
			await ServerAPI.setStatus(ns, batch.target.characteristics.host, ServerStatus.NONE)
			finishedBatchIndices.push(index)
		}
	}

	for (const index of finishedBatchIndices.reverse()) {
		jobMap.batches.splice(index, 1)
	}

	await writeJobMap(ns, jobMap)
}

export async function writeBatch(ns: NS, batch: Batch): Promise<void> {
	const jobMap: JobMap = getJobMap(ns)
	jobMap.batches.push(batch)
	await writeJobMap(ns, jobMap)
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

export async function initializeJobMap(ns: NS): Promise<void> {
	const jobMap: JobMap = { lastUpdated: new Date(), batches: [] }

	await writeJobMap(ns, jobMap)
}