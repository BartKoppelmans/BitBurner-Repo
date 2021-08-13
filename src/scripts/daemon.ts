import type { BitBurner as NS }             from 'Bitburner'
import * as ControlFlowAPI                  from '/src/api/ControlFlowAPI.js'
import * as JobAPI                          from '/src/api/JobAPI.js'
import * as LogAPI                          from '/src/api/LogAPI.js'
import * as ServerAPI                       from '/src/api/ServerAPI.js'
import BatchJob                             from '/src/classes/BatchJob.js'
import HackableServer                       from '/src/classes/HackableServer.js'
import Job                                  from '/src/classes/Job.js'
import Server                               from '/src/classes/Server.js'
import { Cycle }                            from '/src/interfaces/HackInterfaces.js'
import { HackableServerList, ServerStatus } from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }                         from '/src/lib/constants.js'
import { Tools }                            from '/src/tools/Tools.js'
import * as CycleUtils                      from '/src/util/CycleUtils.js'
import * as HackUtils                       from '/src/util/HackUtils.js'
import * as ToolUtils                       from '/src/util/ToolUtils.js'
import { Heuristics }                       from '/src/util/Heuristics.js'
import * as Utils                           from '/src/util/Utils.js'
import { LogType }                          from '/src/interfaces/LogInterfaces.js'

let isHacking: boolean = false
let hackLoopTimeout: ReturnType<typeof setTimeout>
let runnerInterval: ReturnType<typeof setInterval>

async function initialize(ns: NS) {

	Utils.disableLogging(ns)

	// TODO: Kill all running scripts, as there might be some shit from last session open

	await ServerAPI.initializeServerMap(ns)
	await JobAPI.initializeJobMap(ns)

	await JobAPI.startJobManager(ns)
}

async function hackLoop(ns: NS): Promise<void> {

	// Get the potential targets
	let potentialTargets: HackableServerList = await ServerAPI.getTargetServers(ns)

	// Then evaluate the potential targets afterwards
	await Promise.all(potentialTargets.map(async (target) => {
		return target.evaluate(ns, Heuristics.DiscordHeuristic)
	}))

	// We would have a problem if there are no targets
	if (potentialTargets.length === 0) {
		throw new Error('No potential targets found.')
	}

	// Sort the potential targets
	potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!)

	// Attack each of the targets
	for await (const target of potentialTargets) {

		while (isHacking) {
			await ns.sleep(CONSTANT.SMALL_DELAY)
		}

		isHacking = true

		const currentTargets: HackableServer[] = await ServerAPI.getCurrentTargets(ns)

		// Can't have too many targets at the same time
		if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
			isHacking = false
			break
		}

		await hack(ns, target)

		isHacking = false
	}

	hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY)
}

async function hack(ns: NS, target: HackableServer): Promise<void> {
	// If it is prepping or targeting, leave it
	if (target.status !== ServerStatus.NONE) return

	// The server is not optimal, so we have to prep it first
	if (!target.isOptimal(ns)) {
		await prepServer(ns, target)
		return
	}

	// Make sure that the percentage that we steal is optimal
	await optimizePerformance(ns, target)

	await attackServer(ns, target)

	return
}

async function prepServer(ns: NS, target: HackableServer): Promise<void> {

	// If the server is optimal, we are done I guess
	if (target.isOptimal(ns)) return

	let initialWeakenJob: Job | undefined
	let growJob: Job | undefined
	let compensationWeakenJob: Job | undefined

	const batchId: string = Utils.generateHash()

	const jobs: Job[] = []

	let availableThreads: number = await HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true)
	if (availableThreads <= 0) {
		LogAPI.hack(ns, 'Skipped a prep.')
		return
	}

	// TODO: Ideally we pick the server that can fit all our threads here immediately,
	// then we can have everything on one source server

	// TODO: Refactor this shitshow

	if (target.needsWeaken(ns)) {
		const neededWeakenThreads: number = HackUtils.calculateWeakenThreads(ns, target)

		const weakenThreads: number                   = Math.min(neededWeakenThreads, availableThreads)
		const weakenThreadSpread: Map<Server, number> = await HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true)

		const weakenTime: number = target.getWeakenTime(ns)

		const weakenStart: Date = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY)
		const weakenEnd: Date   = new Date(weakenStart.getTime() + weakenTime)

		initialWeakenJob = new Job(ns, {
			id: Utils.generateHash(),
			batchId,
			start: weakenStart,
			end: weakenEnd,
			target,
			threads: weakenThreads,
			threadSpread: weakenThreadSpread,
			tool: Tools.WEAKEN,
			isPrep: true,
		})

		jobs.push(initialWeakenJob)

		availableThreads -= weakenThreads

		for await (const [server, threads] of weakenThreadSpread) {
			await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN))
		}
	}

	// First grow, so that the amount of money is optimal
	if (target.needsGrow(ns) && availableThreads > 0) {

		const neededGrowthThreads: number       = HackUtils.calculateGrowthThreads(ns, target)
		const compensationWeakenThreads: number = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, neededGrowthThreads)

		const totalThreads: number = neededGrowthThreads + compensationWeakenThreads

		const threadsFit: boolean = (totalThreads < availableThreads)

		// NOTE: Here we do Math.floor, which could cause us not to execute enough weakens/grows
		// However, we currently run into a lot of errors regarding too little threads available, which is why we do
		// this.

		const growthThreads: number = (threadsFit) ? neededGrowthThreads : Math.floor(neededGrowthThreads * (availableThreads / totalThreads))
		const weakenThreads: number = (threadsFit) ? compensationWeakenThreads : Math.floor(compensationWeakenThreads * (availableThreads / totalThreads))

		if (growthThreads > 0 && weakenThreads > 0) {

			const weakenTime: number = target.getWeakenTime(ns)
			const growthTime: number = target.getGrowTime(ns)

			const firstStartTime: Date = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY)

			let growthStartTime: Date
			let growthEndTime: Date
			let compensationWeakenEndTime: Date
			let compensationWeakenStartTime: Date

			if ((growthTime + CONSTANT.JOB_DELAY) > weakenTime) {
				growthStartTime = new Date(firstStartTime.getTime())
				growthEndTime   = new Date(growthStartTime.getTime() + growthTime)

				compensationWeakenEndTime   = new Date(growthEndTime.getTime() + CONSTANT.JOB_DELAY)
				compensationWeakenStartTime = new Date(compensationWeakenEndTime.getTime() - weakenTime)
			} else {
				compensationWeakenStartTime = new Date(firstStartTime.getTime())
				compensationWeakenEndTime   = new Date(compensationWeakenStartTime.getTime() + growthTime)

				growthEndTime   = new Date(compensationWeakenEndTime.getTime() - CONSTANT.JOB_DELAY)
				growthStartTime = new Date(growthEndTime.getTime() - growthTime)
			}

			const growthThreadSpread: Map<Server, number> = await HackUtils.computeThreadSpread(ns, Tools.GROW, growthThreads, true)

			growJob = new Job(ns, {
				id: Utils.generateHash(),
				batchId,
				target,
				threads: growthThreads,
				threadSpread: growthThreadSpread,
				tool: Tools.GROW,
				isPrep: true,
				start: growthStartTime,
				end: growthEndTime,
			})

			jobs.push(growJob)

			for (const [server, threads] of growthThreadSpread) {
				await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.GROW))
			}

			const compensationWeakenThreadSpread: Map<Server, number> = await HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true)

			compensationWeakenJob = new Job(ns, {
				id: Utils.generateHash(),
				batchId,
				target,
				threads: weakenThreads,
				threadSpread: compensationWeakenThreadSpread,
				tool: Tools.WEAKEN,
				isPrep: true,
				start: compensationWeakenStartTime,
				end: compensationWeakenEndTime,
			})

			jobs.push(compensationWeakenJob)

			for (const [server, threads] of compensationWeakenThreadSpread) {
				await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN))
			}
		}
	}

	// We could not create any jobs, probably the RAM was already fully used.
	// TODO: Filter this at the start, if we cannot start any threads, we should not even go here
	if (jobs.length === 0) return

	const batchJob: BatchJob = new BatchJob(ns, {
		batchId,
		target,
		jobs,
	})

	await JobAPI.startBatchJob(ns, batchJob)
}

async function attackServer(ns: NS, target: HackableServer): Promise<void> {

	const numPossibleCycles: number = await CycleUtils.computeCycles(ns, target)

	const numCycles: number = Math.min(numPossibleCycles, CONSTANT.MAX_CYCLE_NUMBER)

	const batchId: string = Utils.generateHash()

	if (numCycles === 0) {
		LogAPI.hack(ns, 'Skipped an attack.')
		return
	}

	const cycles: Cycle[] = []

	for (let i = 0; i < numCycles; i++) {
		const cycle: Cycle = await CycleUtils.scheduleCycle(ns, target, batchId, cycles[cycles.length - 1])
		cycles.push(cycle)

		await ns.sleep(CONSTANT.SMALL_DELAY)
	}

	if (cycles.length === 0) {
		throw new Error('No cycles created')
	}

	const jobs: Job[] = cycles.reduce((array: Job[], cycle: Cycle) => [...array, cycle.hack, cycle.weaken1, cycle.growth, cycle.weaken2], [])

	// Create the batch object
	const batchJob: BatchJob = new BatchJob(ns, {
		batchId: Utils.generateHash(),
		target,
		jobs,
	})

	await JobAPI.startBatchJob(ns, batchJob)
}

async function optimizePerformance(ns: NS, target: HackableServer): Promise<void> {
	let performanceUpdated: boolean = false

	const originalPercentageToSteal: number                                     = target.percentageToSteal
	let optimalTarget: { percentageToSteal: number, profitsPerSecond: number; } = {
		percentageToSteal: CONSTANT.MIN_PERCENTAGE_TO_STEAL,
		profitsPerSecond: -1,
	}
	for (let n = CONSTANT.MIN_PERCENTAGE_TO_STEAL; n <= CONSTANT.MAX_PERCENTAGE_TO_STEAL; n += CONSTANT.DELTA_PERCENTAGE_TO_STEAL) {
		target.percentageToSteal = n
		const cycles: number     = await CycleUtils.computeCycles(ns, target)
		const profit: number     = target.staticHackingProperties.maxMoney * target.percentageToSteal * cycles

		const totalTime: number = CycleUtils.calculateTotalBatchTime(ns, target, cycles)

		const profitsPerSecond: number = profit / totalTime

		if (profitsPerSecond > optimalTarget.profitsPerSecond) {
			optimalTarget = { percentageToSteal: n, profitsPerSecond }
		}
	}

	target.percentageToSteal = optimalTarget.percentageToSteal

	if (originalPercentageToSteal !== optimalTarget.percentageToSteal) performanceUpdated = true

	if (performanceUpdated) {
		LogAPI.hack(ns, `Updated percentage to steal for ${target.characteristics.host} to ~${Math.round(target.percentageToSteal * 100)}%`)
	}
}

export async function destroy(ns: NS) {
	clearTimeout(hackLoopTimeout)
	clearTimeout(runnerInterval)

	// TODO: Wait until it is done executing

	LogAPI.log(ns, 'Stopping the daemon', LogType.INFORMATION)
}

export async function main(ns: NS) {

	const hostName: string = ns.getHostname()
	if (hostName !== 'home') {
		throw new Error('Execute daemon script from home.')
	}

	// TODO: Make a decision on whether we start the to-be-made early hacking scripts,
	// or whether we want to start hacking using our main hacker

	await initialize(ns)

	LogAPI.log(ns, 'Starting the daemon', LogType.INFORMATION)

	hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY)
	runnerInterval  = setInterval(ControlFlowAPI.launchRunners.bind(null, ns), CONSTANT.RUNNER_INTERVAL)

	// TODO: Here we should check whether we are still running the hackloop
	while (true) {
		const shouldKill: boolean = await ControlFlowAPI.hasDaemonKillRequest(ns)

		if (shouldKill) {
			await destroy(ns)
			ns.exit()
			return
		}

		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}