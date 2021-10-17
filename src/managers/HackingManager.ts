import type { BitBurner as NS }                            from 'Bitburner'
import { ProcessInfo }                                     from 'Bitburner'
import * as LogAPI                                         from '/src/api/LogAPI.js'
import * as Utils                                          from '/src/util/Utils.js'
import * as HackingUtils                                   from '/src/util/HackingUtils.js'
import { Manager }                                         from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                                        from '/src/lib/constants.js'
import HackableServer                                      from '/src/classes/Server/HackableServer.js'
import * as ServerAPI                                      from '/src/api/ServerAPI.js'
import { ServerPurpose, ServerType, UtilizationDataPoint } from '/src/classes/Server/ServerInterfaces.js'
import Job                                                 from '/src/classes/Job/Job.js'
import * as JobAPI                                         from '/src/api/JobAPI.js'
import { JobMap }                                          from '/src/classes/Job/JobInterfaces.js'
import Server                                              from '/src/classes/Server/Server.js'
import { PurchasedServer }                                 from '/src/classes/Server/PurchasedServer.js'
import { HacknetServer }                                   from '/src/classes/Server/HacknetServer.js'

const JOB_MANAGING_LOOP_INTERVAL          = 1000 as const
const HACKING_LOOP_DELAY: number          = 2000 as const
const UTILIZATION_DATA_POINTS: number     = 10 as const
const UTILIZATION_DELTA_THRESHOLD: number = 0.4 as const

const MAX_TARGET_COUNT: number = 30 as const

class HackingManager implements Manager {

	private hackingLoopInterval?: ReturnType<typeof setTimeout>
	private jobLoopInterval?: ReturnType<typeof setInterval>

	private dataPoints: { hacknetServers: UtilizationDataPoint[], purchasedServers: UtilizationDataPoint[] } = {
		hacknetServers: [],
		purchasedServers: [],
	}

	private static getUtilizationDataPoint(ns: NS, servers: Server[]): UtilizationDataPoint {
		return {
			prep: ServerAPI.getServerUtilization(ns, servers, ServerPurpose.PREP),
			hack: ServerAPI.getServerUtilization(ns, servers, ServerPurpose.HACK),
			total: ServerAPI.getServerUtilization(ns, servers),
		}
	}


	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		await ServerAPI.initializeServerMap(ns)
		await JobAPI.initializeJobMap(ns)

		await JobAPI.cancelAllJobs(ns, true)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the JobManager`)
		this.jobLoopInterval = setInterval(this.jobLoop.bind(this, ns), JOB_MANAGING_LOOP_INTERVAL)

		LogAPI.printTerminal(ns, `Starting the HackingManager`)
		this.hackingLoopInterval = setTimeout(this.hackingLoop.bind(this, ns), HACKING_LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.hackingLoopInterval) clearTimeout(this.hackingLoopInterval)
		if (this.jobLoopInterval) clearInterval(this.jobLoopInterval)

		await JobAPI.cancelAllJobs(ns)
		await JobAPI.clearJobMap(ns)

		LogAPI.printTerminal(ns, `Stopping the JobManager`)
		LogAPI.printTerminal(ns, `Stopping the HackingManager`)
	}

	private async updatePurchasedServerPurposes(ns: NS): Promise<void> {
		const servers: PurchasedServer[]      = ServerAPI.getPurchasedServers(ns)
		const dataPoint: UtilizationDataPoint = HackingManager.getUtilizationDataPoint(ns, servers)

		this.dataPoints.purchasedServers.length = Math.min(this.dataPoints.purchasedServers.length, UTILIZATION_DATA_POINTS - 1)

		this.dataPoints.purchasedServers.unshift(dataPoint)

		if (this.dataPoints.purchasedServers.length < UTILIZATION_DATA_POINTS) return

		const shouldAddPrepServer: boolean = this.dataPoints.purchasedServers.every((point) => point.prep - point.hack > UTILIZATION_DELTA_THRESHOLD)
		const shouldAddHackServer: boolean = this.dataPoints.purchasedServers.every((point) => {
			return point.hack - point.prep > UTILIZATION_DELTA_THRESHOLD || point.prep < UTILIZATION_DELTA_THRESHOLD
		})

		if (shouldAddHackServer) await ServerAPI.moveServerPurpose(ns, ServerPurpose.HACK, ServerType.PurchasedServer)
		else if (shouldAddPrepServer) await ServerAPI.moveServerPurpose(ns, ServerPurpose.PREP, ServerType.PurchasedServer)
		else return

		// Reset the measurements to prevent immediately adding another server
		this.dataPoints.purchasedServers.length = 0
	}

	private async updateHacknetServerPurposes(ns: NS): Promise<void> {
		const servers: HacknetServer[]        = ServerAPI.getHacknetServers(ns)
		const dataPoint: UtilizationDataPoint = HackingManager.getUtilizationDataPoint(ns, servers)

		this.dataPoints.hacknetServers.length = Math.min(this.dataPoints.hacknetServers.length, UTILIZATION_DATA_POINTS - 1)

		this.dataPoints.hacknetServers.unshift(dataPoint)

		if (this.dataPoints.hacknetServers.length < UTILIZATION_DATA_POINTS) return

		const shouldAddPrepServer: boolean = this.dataPoints.hacknetServers.every((point) => point.prep - point.hack > UTILIZATION_DELTA_THRESHOLD)
		const shouldAddHackServer: boolean = this.dataPoints.hacknetServers.every((point) => {
			return point.hack - point.prep > UTILIZATION_DELTA_THRESHOLD || point.prep < UTILIZATION_DELTA_THRESHOLD
		})

		if (shouldAddHackServer) await ServerAPI.moveServerPurpose(ns, ServerPurpose.HACK, ServerType.HacknetServer)
		else if (shouldAddPrepServer) await ServerAPI.moveServerPurpose(ns, ServerPurpose.PREP, ServerType.HacknetServer)
		else return

		// Reset the measurements to prevent immediately adding another server
		this.dataPoints.hacknetServers.length = 0
	}

	private async jobLoop(ns: NS): Promise<void> {
		const jobMap: JobMap                  = JobAPI.getJobMap(ns)
		const runningProcesses: ProcessInfo[] = JobAPI.getRunningProcesses(ns)

		// NOTE: It might be better to provide the batch id to the api and kill that way

		const finishedJobs: Job[] = []
		for (const batch of jobMap.batches) {
			const jobs: Job[] = batch.jobs.filter((job) => !job.pids.some((pid) => runningProcesses.some((process) => process.pid === pid)))
			finishedJobs.push(...jobs)
		}

		if (finishedJobs.length > 0) await JobAPI.finishJobs(ns, finishedJobs)
	}

	private async hackingLoop(ns: NS): Promise<void> {
		await this.updatePurchasedServerPurposes(ns)
		await this.updateHacknetServerPurposes(ns)

		// Get the potential targets
		let potentialTargets: HackableServer[] = ServerAPI.getTargetServers(ns)

		// We would have a problem if there are no targets
		if (potentialTargets.length === 0) {
			throw new Error('No potential targets found.')
		}

		// Sort the potential targets
		potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!)

		// Attack each of the targets
		for (const target of potentialTargets) {

			const currentTargets: HackableServer[] = ServerAPI.getCurrentTargets(ns)

			// Can't have too many targets at the same time
			if (currentTargets.length >= MAX_TARGET_COUNT) {
				break
			}

			await HackingUtils.hack(ns, target)
		}

		this.hackingLoopInterval = setTimeout(this.hackingLoop.bind(this, ns), HACKING_LOOP_DELAY)
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: HackingManager = new HackingManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}