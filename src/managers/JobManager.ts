import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import * as ControlFlowAPI                   from '/src/api/ControlFlowAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import * as JobAPI                           from '/src/api/JobAPI.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as Utils                            from '/src/util/Utils.js'
import { Manager }                           from '/src/interfaces/ClassInterfaces.js'
import { JobList, JobMap }                   from '/src/interfaces/JobInterfaces.js'
import { LogType }                           from '/src/interfaces/LogInterfaces.js'

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
		LogAPI.log(ns, `Starting the JobManager`, LogType.INFORMATION)

		this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), CONSTANT.JOB_MANAGING_LOOP_INTERVAL)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopInterval) clearInterval(this.managingLoopInterval)

		await JobAPI.cancelAllJobs(ns)

		await JobAPI.clearJobMap(ns)

		LogAPI.log(ns, `Stopping the JobManager`, LogType.INFORMATION)
	}

	private async managingLoop(ns: NS): Promise<void> {

		const jobMap: JobMap                  = await JobAPI.getJobMap(ns)
		const runningProcesses: ProcessInfo[] = await JobAPI.getRunningProcesses(ns)
		const finishedJobs: JobList           = jobMap.jobs.filter((job) => !runningProcesses.some((process) => !job.pids.includes(process.pid)))

		for (const finishedJob of finishedJobs) {
			await JobAPI.finishJob(ns, finishedJob)
		}

	}

	/*
	 private async startBatchJob(ns: NS, batchJob: BatchJob): Promise<void> {

	 const originalStatus: ServerStatus = batchJob.target.status

	 // Set the status
	 const status: ServerStatus = (batchJob.jobs[0].isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING
	 await ServerAPI.updateStatus(ns, batchJob.target, status)

	 let hasExecutedJob: boolean = false

	 for await (const job of batchJob.jobs) {
	 try {
	 // Attempt to execute the job
	 await this.startJob(ns, job, true)

	 hasExecutedJob = true
	 } catch (error) {

	 ns.tprint('We have an error') // TODO: Remove this

	 await LogAPI.log(ns, `Error encountered: \n
	 ${error.name} \n
	 ${error.message} \n
	 ${error.stack}
	 `, true, LogMessageCode.WARNING)

	 if (!hasExecutedJob) {

	 // If it fails on the first job, revert the status
	 await ServerAPI.updateStatus(ns, batchJob.target, originalStatus)

	 }

	 // Stop executing the jobs, but let the old ones run
	 // TODO: Kill the old jobs
	 break
	 }
	 }
	 }

	 private async startJob(ns: NS, job: Job, wasBatchJob: boolean): Promise<void> {

	 if (!wasBatchJob) {
	 const status: ServerStatus = (job.isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING
	 await ServerAPI.updateStatus(ns, job.target, status)
	 }

	 await job.execute(ns)

	 this.jobs.push(job)
	 job.onStart(ns)

	 setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now())
	 }

	 private async finishJob(ns: NS, id: number): Promise<void> {
	 const index: number = this.jobs.findIndex(job => job.id === id)

	 if (index === -1) {
	 throw new Error('Could not find the job')
	 }

	 const oldJob: Job = this.jobs.splice(index, 1)[0]

	 const otherJobIndex: number = this.jobs.findIndex((job) => oldJob.target.characteristics.host === job.target.characteristics.host)

	 if (otherJobIndex === -1) {
	 await ServerAPI.updateStatus(ns, oldJob.target, ServerStatus.NONE)
	 }

	 oldJob.onFinish(ns)
	 }*/

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