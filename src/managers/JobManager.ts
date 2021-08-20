import type { BitBurner as NS, ProcessInfo } from 'Bitburner'
import { Flag }                              from 'Bitburner'
import * as ControlFlowAPI                   from '/src/api/ControlFlowAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import * as JobAPI                           from '/src/api/JobAPI.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import * as Utils                            from '/src/util/Utils.js'
import { Manager }                           from '/src/classes/Misc/ScriptInterfaces.js'
import { JobMap }                            from '/src/classes/Job/JobInterfaces.js'
import Job                                   from '/src/classes/Job/Job.js'
import Batch                                 from '/src/classes/Job/Batch'
import { Tools }                             from '/src/tools/Tools.js'

const JOB_MANAGING_LOOP_INTERVAL = 1000 as const

class JobManager implements Manager {

	private managingLoopInterval?: ReturnType<typeof setInterval>

	private readonly validation: boolean

	constructor(validation: boolean) {
		this.validation = validation
	}

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

		// We want to validate in between to make sure that we validate finished batches as well
		// NOTE: This will make it a bit slower
		if (this.validation) JobManager.validate(ns)

		if (finishedJobs.length > 0) JobAPI.removeFinishedBatches(ns)
	}

	private static validate(ns: NS): void {
		const jobMap: JobMap = JobAPI.getJobMap(ns)

		jobMap.batches.forEach((batch) => {
			let isValid: boolean
			if (batch.jobs[0].isPrep) isValid = this.validatePrep(ns, batch)
			else isValid = this.validateAttack(ns, batch)

			if (!isValid) console.log(batch)
		})
	}

	// validatePrep only checks the timings of each prep
	private static validatePrep(ns: NS, batch: Batch): boolean {

		const targetHost: string = batch.target.characteristics.host
		const batchId: string    = batch.batchId

		if (batch.jobs.length === 1) {
			// We only did a weaken, so we can't check timings
			return true
		} else if (batch.jobs.length === 2) {
			// We did a grow and weaken combination
			const growth: Job | undefined = batch.jobs.find((job) => job.tool === Tools.GROW)
			const weaken: Job | undefined = batch.jobs.find((job) => job.tool === Tools.WEAKEN)

			if (!growth || !weaken) {
				LogAPI.warn(ns, `${batchId} An incorrect prep was created for ${targetHost}`)
				return false
			}

			if (!growth.finished && weaken.finished) {
				LogAPI.warn(ns, `${batchId} Prep timings are off, weaken finished before growth`)
				return false
			}
		} else if (batch.jobs.length === 3) {
			// We did a grow and weaken combination

			// NOTE: Here we assume that the batch was sorted on end times (first end time goes first)
			const initialWeaken: Job | undefined      = batch.jobs.find((job) => job.tool === Tools.WEAKEN)
			const growth: Job | undefined             = batch.jobs.find((job) => job.tool === Tools.GROW)
			const compensationWeaken: Job | undefined = batch.jobs.reverse().find((job) => job.tool === Tools.WEAKEN)

			if (!initialWeaken || !growth || !compensationWeaken) {
				LogAPI.warn(ns, `${batchId} An incorrect prep was created for ${targetHost}`)
				return false
			}

			if (!initialWeaken.finished && (growth.finished || compensationWeaken.finished)) {
				LogAPI.warn(ns, `${batchId} Prep timings are off, growth or compensation finished before weaken`)
				return false
			} else if (compensationWeaken.finished && !growth.finished) {
				LogAPI.warn(ns, `${batchId} Prep timings are off, compensation weaken finished before growth`)
				return false
			}
		}

		return true
	}

	private static validateAttack(ns: NS, batch: Batch): boolean {
		return true
	}
}

export async function start(ns: NS, validate: boolean): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	if (validate) {
		ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST, 1, '--validate')
	} else {
		ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST)
	}

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST) ||
		ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST, '--validate')
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const flags: Flag = ns.flags([
		['validate', false],
	])

	const instance: JobManager = new JobManager(flags.validate as boolean)

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}