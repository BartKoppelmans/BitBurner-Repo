import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import * as ControlFlowAPI                   from '/src/api/ControlFlowAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import * as JobAPI                           from '/src/api/JobAPI.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as Utils                            from '/src/util/Utils.js'
import { Manager }                           from '/src/interfaces/ClassInterfaces.js'
import { JobList, JobMap }                   from '/src/interfaces/JobInterfaces.js'

class JobManager implements Manager {

	private managingLoopInterval?: ReturnType<typeof setInterval>

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		const jobMap: JobMap = await JobAPI.getJobMap(ns)

		if (jobMap.jobs.length > 0) {
			await JobAPI.cancelAllJobs(ns)
		}

	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the JobManager`)

		this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), CONSTANT.JOB_MANAGING_LOOP_INTERVAL)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopInterval) clearInterval(this.managingLoopInterval)

		await JobAPI.cancelAllJobs(ns)

		await JobAPI.clearJobMap(ns)

		LogAPI.debug(ns, `Stopping the JobManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {

		const jobMap: JobMap                  = await JobAPI.getJobMap(ns)
		const runningProcesses: ProcessInfo[] = await JobAPI.getRunningProcesses(ns)
		const finishedJobs: JobList           = jobMap.jobs.filter((job) => !runningProcesses.some((process) => job.pids.includes(process.pid)))

		for (const finishedJob of finishedJobs) {
			await JobAPI.finishJob(ns, finishedJob)
		}

	}
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: JobManager = new JobManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		const shouldKill: boolean = await ControlFlowAPI.hasManagerKillRequest(ns)

		if (shouldKill) {
			await instance.destroy(ns)
			ns.exit()
			return
		}

		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}