import type { NS, ProcessInfo }    from 'Bitburner'
import Batch                       from '/src/classes/Job/Batch.js'
import Job                         from '/src/classes/Job/Job.js'
import * as ServerAPI              from '/src/api/ServerAPI.js'
import * as LogAPI                 from '/src/api/LogAPI.js'
import * as ToolUtils              from '/src/util/ToolUtils.js'
import { ServerMap, ServerStatus } from '/src/classes/Server/ServerInterfaces.js'
import { RamSpread }               from '/src/classes/Misc/HackInterfaces.js'
import { Tools }                   from '/src/tools/Tools.js'
import { JobStorage }              from '/src/classes/Storage/JobStorage'

export async function startBatch(ns: NS, jobStorage: JobStorage, batch: Batch): Promise<void> {
	// TODO: We should do some checking in here

	const isPrep: boolean = batch.jobs[0].isPrep

	await ServerAPI.setStatus(ns, batch.target.characteristics.host, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING)

	await startJobs(ns, batch.jobs)

	jobStorage.addBatch(batch)
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

export async function finishJobs(ns: NS, jobStorage: JobStorage, jobs: Job[]): Promise<void> {

	for (const job of jobs) {
		if (job.finished) continue
		jobStorage.setJobStatus(job, true)
		job.onFinish(ns)
	}

	const batches: Batch[] = [...jobStorage.batches]
	for (const batch of batches) {
		if (JobStorage.isBatchFinished(batch)) {
			await ServerAPI.setStatus(ns, batch.target.characteristics.host, ServerStatus.NONE)
			jobStorage.removeBatch(batch)
		}
	}
}

export function getRunningProcesses(ns: NS): ProcessInfo[] {
	const serverMap: ServerMap            = ServerAPI.getServerMap(ns)
	const runningProcesses: ProcessInfo[] = []
	for (const server of serverMap.servers) {
		runningProcesses.push(...ns.ps(server.characteristics.host))
	}
	return runningProcesses
}

export function cancelAllJobs(ns: NS, jobStorage?: JobStorage): void {

	if (jobStorage) {
		for (const batch of jobStorage.batches) {
			for (const job of batch.jobs) {
				job.finished = true
				cancelJob(ns, jobStorage, job)
			}
		}

		jobStorage.clear()
	} else {
		const serverMap: ServerMap = ServerAPI.getServerMap(ns)

		for (const server of serverMap.servers) {
			ns.scriptKill(Tools.WEAKEN, server.characteristics.host)
			ns.scriptKill(Tools.GROW, server.characteristics.host)
			ns.scriptKill(Tools.HACK, server.characteristics.host)
		}
	}
}

export function cancelJob(ns: NS, jobStorage: JobStorage, job: Job): void {
	// TODO: We should do some checking here

	if (job.finished) return // The job has already finished so meh

	if (job.pids.length === 0) throw new Error('Cannot cancel a job without the pids')

	let allKilled: boolean = true
	for (const pid of job.pids) {
		const processKilled: boolean = ns.kill(pid)
		allKilled                    = allKilled && processKilled
	}

	job.onCancel(ns)

	if (!allKilled) LogAPI.printTerminal(ns, `Failed to cancel job ${job.id}`)
}