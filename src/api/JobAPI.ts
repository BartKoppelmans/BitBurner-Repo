import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import BatchJob                              from '/src/classes/Job/BatchJob.js'
import Job                                   from '/src/classes/Job/Job.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import { JobList, JobMap }                   from '/src/classes/Job/JobInterfaces.js'
import * as ServerAPI                        from '/src/api/ServerAPI.js'
import * as ToolUtils                        from '/src/util/ToolUtils.js'
import * as SerializationUtils               from '/src/util/SerializationUtils.js'
import { ServerMap, ServerStatus }           from '/src/classes/Server/ServerInterfaces.js'
import Server                                from '/src/classes/Server/Server.js'

export async function getJobMap(ns: NS): Promise<JobMap> {
	return await readJobMap(ns)
}

async function readJobMap(ns: NS): Promise<JobMap> {
	const jobMapString: string = ns.read(CONSTANT.JOB_MAP_FILENAME).toString()

	const jobMap: JobMap = JSON.parse(jobMapString)
	jobMap.lastUpdated   = new Date(jobMap.lastUpdated)

	const jobObjects: JobList = Array.from(jobMap.jobs)
	jobMap.jobs               = []

	for (const job of jobObjects) {
		jobMap.jobs.push(SerializationUtils.jobFromJSON(ns, job))
	}

	return jobMap
}

export async function clearJobMap(ns: NS): Promise<void> {
	ns.clear(CONSTANT.JOB_MAP_FILENAME)
}

export async function writeJobMap(ns: NS, jobMap: JobMap): Promise<void> {
	// NOTE: Do we want to do this?
	jobMap.lastUpdated = new Date()
	ns.write(CONSTANT.JOB_MAP_FILENAME, JSON.stringify(jobMap), 'w')
}

export async function startBatchJob(ns: NS, batchJob: BatchJob): Promise<void> {
	// TODO: We should do some checking in here

	const isPrep: boolean = batchJob.jobs[0].isPrep
	await ServerAPI.setStatus(ns, batchJob.target, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING)

	for (const job of batchJob.jobs) {
		await startJob(ns, job)
	}

}

async function startJob(ns: NS, job: Job): Promise<void> {

	// TODO: We should do some checking in here

	// TODO: If we didn't start at startBatchJob, then we don't set the server status

	await job.execute(ns)

	await job.onStart(ns)

	await writeJob(ns, job)

	const threadSpread: Map<Server, number> = job.threadSpread
	for (const [server, threads] of threadSpread) {
		const reservation: number = threads * ToolUtils.getToolCost(ns, job.tool)
		await ServerAPI.decreaseReservation(ns, server, reservation)
	}
}

export async function finishJobs(ns: NS, jobs: Job[]): Promise<void> {
	// NOTE: This function manually removes the jobs instead of using removeJob (for performance reasons)
	const jobMap: JobMap = await getJobMap(ns)

	for (const job of jobs) {
		const index: number = jobMap.jobs.findIndex((j) => j.id === job.id)

		if (index === -1) throw new Error('Could not find the job') // NOTE: This should not crash the script

		jobMap.jobs.splice(index, 1)

		await job.onFinish(ns)
	}

	const batches: { target: Server, batchId: string }[] = [...new Map(jobs.map(job => [job.batchId, job])).values()]
		.map((job) => {
			return { target: job.target, batchId: job.batchId! }
		})

	for (const batch of batches) {
		const isBatchFinished: boolean = !jobMap.jobs.some((job) => job.batchId === batch.batchId)
		if (isBatchFinished) {
			await ServerAPI.setStatus(ns, batch.target, ServerStatus.NONE)
		}
	}

	await writeJobMap(ns, jobMap)
}

export async function writeJob(ns: NS, job: Job): Promise<void> {
	const jobMap: JobMap = await getJobMap(ns)

	jobMap.jobs.push(job)

	await writeJobMap(ns, jobMap)
}

export async function getRunningProcesses(ns: NS): Promise<ProcessInfo[]> {

	const serverMap: ServerMap = await ServerAPI.getServerMap(ns)

	const runningProcesses: ProcessInfo[] = []

	for (const server of serverMap.servers) {
		runningProcesses.push(...ns.ps(server.characteristics.host))
	}

	return runningProcesses

}

export async function cancelAllJobs(ns: NS): Promise<void> {

	const jobMap: JobMap = await getJobMap(ns)

	for (const job of jobMap.jobs) {
		await cancelJob(ns, job)
	}

	// TODO: Check whether there are still jobs left that are not cancelled

}

export async function cancelJob(ns: NS, job: Job): Promise<void> {
	// TODO: We should do some checking here

	if (job.pids.length === 0) throw new Error('Cannot cancel a job without the pids')

	let allKilled: boolean = true
	for (const pid of job.pids) {
		const processKilled: boolean = ns.kill(pid)
		allKilled                    = allKilled && processKilled
	}

	await job.onCancel(ns)

	if (!allKilled) throw new Error('Failed to cancel all processes')
}

export async function isJobMapInitialized(ns: NS): Promise<boolean> {
	// TODO: Change the restrictions here, as we have to reset the job map more often
	try {
		const currentJobMap: JobMap = await readJobMap(ns)

		const lastAugTime: Date = new Date(Date.now() - ns.getTimeSinceLastAug())

		// We have updated the server map file already, so we can stop now
		return (lastAugTime <= currentJobMap.lastUpdated)

	} catch (e) {
		return false
	}
}

export async function initializeJobMap(ns: NS): Promise<void> {
	const jobMap: JobMap = { lastUpdated: new Date(), jobs: [] }

	await writeJobMap(ns, jobMap)
}