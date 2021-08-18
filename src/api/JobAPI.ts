import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import BatchJob                              from '/src/classes/Job/BatchJob.js'
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

	const jobObjects: Job[] = Array.from(jobMap.jobs)
	jobMap.jobs             = []

	for (const job of jobObjects) {
		jobMap.jobs.push(SerializationUtils.jobFromJSON(ns, job))
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

export function startBatchJob(ns: NS, batchJob: BatchJob): void {
	// TODO: We should do some checking in here

	const isPrep: boolean = batchJob.jobs[0].isPrep
	ServerAPI.setStatus(ns, batchJob.target, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING)

	for (const job of batchJob.jobs) {
		startJob(ns, job)
	}
}

function startJob(ns: NS, job: Job): void {

	// TODO: We should do some checking in here

	// TODO: If we didn't start at startBatchJob, then we don't set the server status

	job.execute(ns)

	job.onStart(ns)

	writeJob(ns, job)

	const threadSpread: Map<Server, number> = job.threadSpread
	for (const [server, threads] of threadSpread) {
		const reservation: number = threads * ToolUtils.getToolCost(ns, job.tool)
		ServerAPI.decreaseReservation(ns, server, reservation)
	}
}

export function finishJobs(ns: NS, jobs: Job[]): void {
	// NOTE: This function manually removes the jobs instead of using removeJob (for performance reasons)
	const jobMap: JobMap = getJobMap(ns)

	for (const job of jobs) {
		const index: number = jobMap.jobs.findIndex((j) => j.id === job.id)

		if (index === -1) throw new Error('Could not find the job') // NOTE: This should not crash the script

		jobMap.jobs.splice(index, 1)

		job.onFinish(ns)
	}

	const batches: { target: Server, batchId: string }[] = [...new Map(jobs.map(job => [job.batchId, job])).values()]
		.map((job) => {
			return { target: job.target, batchId: job.batchId! }
		})

	for (const batch of batches) {
		const isBatchFinished: boolean = !jobMap.jobs.some((job) => job.batchId === batch.batchId)
		if (isBatchFinished) ServerAPI.setStatus(ns, batch.target, ServerStatus.NONE)
	}

	writeJobMap(ns, jobMap)
}

export function writeJob(ns: NS, job: Job): void {
	const jobMap: JobMap = getJobMap(ns)
	jobMap.jobs.push(job)
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

	for (const job of jobMap.jobs) {
		cancelJob(ns, job)
	}

	// TODO: Check whether there are still jobs left that are not cancelled
}

export function cancelJob(ns: NS, job: Job): void {
	// TODO: We should do some checking here

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
	const jobMap: JobMap = { lastUpdated: new Date(), jobs: [] }

	writeJobMap(ns, jobMap)
}