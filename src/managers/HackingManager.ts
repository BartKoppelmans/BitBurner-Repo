import type { NS }                     from 'Bitburner'
import { ProcessInfo }                 from 'Bitburner'
import * as LogAPI                     from '/src/api/LogAPI.js'
import * as Utils                      from '/src/util/Utils.js'
import * as HackingUtils               from '/src/util/HackingUtils.js'
import { Manager }                     from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                    from '/src/lib/constants.js'
import HackableServer                  from '/src/classes/Server/HackableServer.js'
import * as ServerAPI                  from '/src/api/ServerAPI.js'
import { ServerPurpose, ServerStatus } from '/src/classes/Server/ServerInterfaces.js'
import Job                             from '/src/classes/Job/Job.js'
import * as JobAPI                     from '/src/api/JobAPI.js'
import Server                          from '/src/classes/Server/Server.js'
import { PurchasedServer }             from '/src/classes/Server/PurchasedServer.js'
import { HacknetServer }               from '/src/classes/Server/HacknetServer.js'
import { JobStorage }                  from '/src/classes/Storage/JobStorage.js'

const LOOP_DELAY: number = 2000 as const

class HackingManager implements Manager {

	private inFullAttackMode: boolean  = false
	private serverMapLastUpdated: Date = CONSTANT.EPOCH_DATE

	private jobStorage: JobStorage = new JobStorage()

	private static async setSplitServerPurposes(servers: Server[], ns: NS) {
		const halfwayIndex: number = Math.ceil(servers.length / 2)
		const prepServers          = servers.slice(0, halfwayIndex)
		const hackServers          = servers.slice(halfwayIndex, servers.length)

		for (const prepServer of prepServers) {
			await ServerAPI.setPurpose(ns, prepServer.characteristics.host, ServerPurpose.PREP)
		}

		for (const hackServer of hackServers) {
			await ServerAPI.setPurpose(ns, hackServer.characteristics.host, ServerPurpose.HACK)
		}
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		await ServerAPI.initializeServerMap(ns)
		await this.resetServerPurposes(ns)

		await JobAPI.cancelAllJobs(ns, this.jobStorage)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the HackingManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		await JobAPI.cancelAllJobs(ns, this.jobStorage)

		LogAPI.printTerminal(ns, `Stopping the HackingManager`)
	}

	public async jobLoop(ns: NS): Promise<void> {
		const runningProcesses: ProcessInfo[] = JobAPI.getRunningProcesses(ns)

		const finishedJobs: Job[] = []
		for (const batch of this.jobStorage.batches) {
			const jobs: Job[] = batch.jobs.filter((job) => !job.pids.some((pid) => runningProcesses.some((process) => process.pid === pid)))
			finishedJobs.push(...jobs)
		}

		if (finishedJobs.length > 0) await JobAPI.finishJobs(ns, this.jobStorage, finishedJobs)
	}

	public async hackingLoop(ns: NS): Promise<void> {
		// TODO: Set all hackable servers to prep

		// Get the potential targets
		let potentialTargets: HackableServer[] = ServerAPI.getTargetServers(ns)

		// We would have a problem if there are no targets
		if (potentialTargets.length === 0) {
			throw new Error('No potential targets found.')
		}

		// Sort the potential targets
		potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!)

		await this.updatePurposes(ns, potentialTargets)

		// Attack each of the targets
		for (const target of potentialTargets) {

			const currentTargets: HackableServer[] = ServerAPI.getCurrentTargets(ns)

			// Can't have too many targets at the same time
			if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
				break
			}

			await HackingUtils.hack(ns, this.jobStorage, target)
		}
	}

	private async resetServerPurposes(ns: NS): Promise<void> {
		await ServerAPI.setPurpose(ns, CONSTANT.HOME_SERVER_HOST, ServerPurpose.HACK)

		const hackableServers: HackableServer[]   = ServerAPI.getHackableServers(ns)
		const purchasedServers: PurchasedServer[] = ServerAPI.getPurchasedServers(ns, 'alphabetic')
		const hacknetServers: HacknetServer[]     = ServerAPI.getHacknetServers(ns, 'alphabetic')

		if (hackableServers.length > 0) {
			for (const hackableServer of hackableServers) {
				await ServerAPI.setPurpose(ns, hackableServer.characteristics.host, ServerPurpose.PREP)
			}
		}

		// Set half of the purchasedServers to prep/hack
		if (purchasedServers.length > 0) {
			await HackingManager.setSplitServerPurposes(purchasedServers, ns)
		}

		if (hacknetServers.length > 0) {
			await HackingManager.setSplitServerPurposes(hacknetServers, ns)
		}

		this.inFullAttackMode = false
	}

	private async fullAttackMode(ns: NS): Promise<void> {
		await ServerAPI.setPurpose(ns, CONSTANT.HOME_SERVER_HOST, ServerPurpose.HACK)

		const hackableServers: HackableServer[]   = ServerAPI.getHackableServers(ns)
		const purchasedServers: PurchasedServer[] = ServerAPI.getPurchasedServers(ns, 'alphabetic')
		const hacknetServers: HacknetServer[]     = ServerAPI.getHacknetServers(ns, 'alphabetic')

		if (hackableServers.length > 0) {
			for (const hackableServer of hackableServers) {
				await ServerAPI.setPurpose(ns, hackableServer.characteristics.host, ServerPurpose.HACK)
			}
		}

		// Set half of the purchasedServers to prep/hack
		if (purchasedServers.length > 0) {
			for (const purchasedServer of purchasedServers) {
				await ServerAPI.setPurpose(ns, purchasedServer.characteristics.host, ServerPurpose.HACK)
			}
		}

		if (hacknetServers.length > 0) {
			for (const hacknetServer of hacknetServers) {
				await ServerAPI.setPurpose(ns, hacknetServer.characteristics.host, ServerPurpose.HACK)
			}
		}

		this.inFullAttackMode = true
	}

	private async updatePurposes(ns: NS, targets: HackableServer[]): Promise<void> {

		const lastUpdated: Date   = ServerAPI.getLastUpdated(ns)
		const wasUpdated: boolean = this.serverMapLastUpdated < lastUpdated
		if (wasUpdated) this.serverMapLastUpdated = lastUpdated

		// NOTE: Slice to make sure that we only check our actual targets
		const allOptimal: boolean = targets.slice(0, CONSTANT.MAX_TARGET_COUNT)
		                                   .filter((target) => target.status !== ServerStatus.TARGETING)
		                                   .every((target) => target.isOptimal(ns))

		if ((wasUpdated && allOptimal) || (allOptimal && !this.inFullAttackMode)) {
			await this.fullAttackMode(ns)
		} else if ((wasUpdated && !allOptimal) || (!allOptimal && this.inFullAttackMode)) {
			await this.resetServerPurposes(ns)
		}
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
		await instance.jobLoop(ns)
		await instance.hackingLoop(ns)
		await ns.asleep(LOOP_DELAY)
	}
}