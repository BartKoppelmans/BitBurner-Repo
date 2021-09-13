import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import { hasManagerKillRequest }             from '/src/api/ControlFlowAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import * as JobAPI                           from '/src/api/JobAPI.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as Utils                            from '/src/util/Utils.js'
import { Manager }                           from '/src/classes/Misc/ScriptInterfaces.js'
import { JobMap }                            from '/src/classes/Job/JobInterfaces.js'
import Job                                   from '/src/classes/Job/Job.js'

const JOB_MANAGING_LOOP_INTERVAL = 1000 as const

class JobManager implements Manager {

	private managingLoopInterval?: ReturnType<typeof setInterval>

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		const jobMap: JobMap = await JobAPI.getJobMap(ns)

		if (jobMap.batches.length > 0) {
			await JobAPI.cancelAllJobs(ns)
		}

	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the JobManager`)

		this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), JOB_MANAGING_LOOP_INTERVAL)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopInterval) clearInterval(this.managingLoopInterval)

		await JobAPI.cancelAllJobs(ns)

		await JobAPI.clearJobMap(ns)

		LogAPI.debug(ns, `Stopping the JobManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {
		const jobMap: JobMap                  = JobAPI.getJobMap(ns)
		const runningProcesses: ProcessInfo[] = JobAPI.getRunningProcesses(ns)

		// NOTE: It might be better to provide the batch id to the api and kill that way

		const finishedJobs: Job[] = []
		for (const batch of jobMap.batches) {
			const jobs: Job[] = batch.jobs.filter((job) => !job.pids.some((pid) => runningProcesses.some((process) => process.pid === pid)))
			finishedJobs.push(...jobs)
		}

		if (finishedJobs.length > 0) JobAPI.finishJobs(ns, finishedJobs)
	}
}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: JobManager = new JobManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}