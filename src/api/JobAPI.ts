import type { NS, ProcessInfo }    from 'Bitburner'
import Batch                       from '/src/classes/Job/Batch.js'
import Job                         from '/src/classes/Job/Job.js'
import { CONSTANT }                from '/src/lib/constants.js'
import { JobMap }                  from '/src/classes/Job/JobInterfaces.js'
import * as ServerAPI              from '/src/api/ServerAPI.js'
import * as LogAPI                 from '/src/api/LogAPI.js'
import * as ToolUtils              from '/src/util/ToolUtils.js'
import * as SerializationUtils     from '/src/util/SerializationUtils.js'
import { ServerMap, ServerStatus } from '/src/classes/Server/ServerInterfaces.js'
import { RamSpread }               from '/src/classes/Misc/HackInterfaces.js'
import { Tools }                   from '/src/tools/Tools.js'
import HackableServer              from '/src/classes/Server/HackableServer.js'

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

	await startJobs(ns, batch.jobs)

	await writeBatch(ns, batch)
}

async function startJobs(ns: NS, jobs: Job[]): Promise<void> {

	// TODO: We should do some checking in here

	for (const job of jobs) {
		await job.execute(ns)
		job.onStart(ns)
	}

	const ramSpread: RamSpread = createRamSpread(ns, jobs)
	await ServerAPI.decreaseReservations(ns, ramSpread)

}

function createRamSpread(ns: NS, jobs: Job[]): RamSpread {
	const ramSpread: RamSpread = new Map<string, number>()
	for (const job of jobs) {
		const threadCost: number = ToolUtils.getToolCost(ns, job.tool)
		for (const [server, threads] of job.threadSpread) {
			let ram: number = threads * threadCost
			if (ramSpread.has(server)) {
				ram += ramSpread.get(server)!
			}
			ramSpread.set(server, ram)
		}
	}
	return ramSpread
}

export function getServerBatchJob(ns: NS, server: HackableServer): Batch {
	const jobMap: JobMap = getJobMap(ns)

	const batch: Batch | undefined  = jobMap.batches.find((b) => b.target.characteristics.host === server.characteristics.host)
	if (!batch) throw new Error(`Could not find the batch`)

	return batch
}

export async function finishJobs(ns: NS, jobs: Job[]): Promise<void> {
	// NOTE: This function manually removes the jobs instead of using removeJob (for performance reasons)
	const jobMap: JobMap = getJobMap(ns)

	for (const finishedJob of jobs) {
		if (finishedJob.finished) continue

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

export function cancelAllJobs(ns: NS, force: boolean = false): void {

	if (!force) {
		const jobMap: JobMap = getJobMap(ns)

		for (const batch of jobMap.batches) {
			for (const job of batch.jobs) {
				cancelJob(ns, job)
			}
		}
	} else {
		const serverMap: ServerMap = ServerAPI.getServerMap(ns)

		for (const server of serverMap.servers) {
			ns.scriptKill(Tools.WEAKEN, server.characteristics.host)
			ns.scriptKill(Tools.GROW, server.characteristics.host)
			ns.scriptKill(Tools.HACK, server.characteristics.host)
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

	if (!allKilled) LogAPI.printTerminal(ns, 'Failed to cancel all jobs')
}

export async function initializeJobMap(ns: NS): Promise<void> {
	const jobMap: JobMap = { lastUpdated: new Date(), batches: [] }

	await writeJobMap(ns, jobMap)
}