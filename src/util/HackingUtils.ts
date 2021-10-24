import type { BitBurner as NS }                         from 'Bitburner'
import * as ServerAPI                                   from '/src/api/ServerAPI.js'
import HackableServer                                   from '/src/classes/Server/HackableServer.js'
import Server                                           from '/src/classes/Server/Server.js'
import { CONSTANT }                                     from '/src/lib/constants.js'
import { Tools }                                        from '/src/tools/Tools.js'
import * as ToolUtils                                   from '/src/util/ToolUtils.js'
import { Cycle, CycleSpread, PrepEffect, ThreadSpread } from '/src/classes/Misc/HackInterfaces.js'
import { ServerStatus }                                 from '/src/classes/Server/ServerInterfaces.js'
import Job                                              from '/src/classes/Job/Job.js'
import * as Utils                                       from '/src/util/Utils.js'
import Batch                                            from '/src/classes/Job/Batch.js'
import * as JobAPI                                      from '/src/api/JobAPI.js'
import * as HackingCalculationUtils                     from '/src/util/HackingCalculationUtils.js'
import * as LogAPI                                      from '/src/api/LogAPI.js'

// const MAX_CYCLE_NUMBER: number = 50 as const // TODO: Find a way to determine this dynamically

export async function hack(ns: NS, target: HackableServer): Promise<void> {
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

async function createJob(ns: NS, target: HackableServer, tool: Tools, prepEffects: PrepEffect[], batchId: string, start: Date, end: Date): Promise<Job> {

	const threadSpread: ThreadSpread = new Map<string, number>()
	for (const prepEffect of prepEffects) {
		threadSpread.set(prepEffect.source.characteristics.host, prepEffect.threads)
		await ServerAPI.increaseReservation(ns, prepEffect.source.characteristics.host, prepEffect.threads * ToolUtils.getToolCost(ns, tool))
	}

	const threads: number = prepEffects.reduce((total, prepEffect) => total + prepEffect.threads, 0)

	return new Job(ns, {
		id: Utils.generateHash(),
		batchId,
		start,
		end,
		target,
		threads,
		threadSpread,
		tool,
		isPrep: true,
	})

}

function calculateTimings(growthTime: number, weakenTime: number, firstStartTime: Date): {growthStart: Date, growthEnd: Date, weakenStart: Date, weakenEnd: Date} {
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

	return {
		growthStart: growthStartTime,
		growthEnd: growthEndTime,
		weakenStart: compensationWeakenStartTime,
		weakenEnd: compensationWeakenEndTime
	}
}

export async function prepServer(ns: NS, target: HackableServer): Promise<void> {

	// If the server is optimal, we are done I guess
	if (target.isOptimal(ns)) return

	let initialWeakenJob: Job | undefined
	let growJob: Job | undefined
	let compensationWeakenJob: Job | undefined

	const batchId: string = Utils.generateHash()
	let startTime: Date | undefined
	let endTime: Date | undefined

	const jobs: Job[] = []

	if (target.needsWeaken(ns)) {
		let weakenAmount: number = target.getSecurityLevel(ns) - target.staticHackingProperties.minSecurityLevel

		const weakenPrepEffects: PrepEffect[] = []

		for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
			const potentialPrepEffect: PrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.WEAKEN, target, preppingServer, target.staticHackingProperties.minSecurityLevel + weakenAmount)

			// TODO: This might be a problem if we do need to weaken, but for some reason we cannot put in a  full thread?

			if (potentialPrepEffect.threads === 0) continue

			weakenAmount -= potentialPrepEffect.amount
			weakenPrepEffects.push(potentialPrepEffect)

			if (weakenAmount <= 0) break;
		}

		if (weakenPrepEffects.length > 0) {
			const weakenTime: number = target.getWeakenTime(ns)

			const weakenStart: Date = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY)
			const weakenEnd: Date   = new Date(weakenStart.getTime() + weakenTime)

			initialWeakenJob = await createJob(ns, target, Tools.WEAKEN, weakenPrepEffects, batchId, weakenStart, weakenEnd)

			startTime = weakenStart
			endTime   = weakenEnd

			jobs.push(initialWeakenJob)
		}
	}

	// First grow, so that the amount of money is optimal
	if (target.needsGrow(ns)) {

		const weakenTime: number = target.getWeakenTime(ns)
		const growthTime: number = target.getGrowTime(ns)

		const firstStartTime: Date = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY)
		startTime = firstStartTime

		const timings = calculateTimings(growthTime, weakenTime, firstStartTime)

		let growAmount: number =  target.staticHackingProperties.maxMoney - target.getMoney(ns)
		const growPrepEffects: PrepEffect[] = []
		for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
			const potentialPrepEffect: PrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.GROW, target, preppingServer, target.staticHackingProperties.maxMoney - growAmount)

			if (potentialPrepEffect.threads === 0) continue;

			growAmount -= potentialPrepEffect.amount
			growPrepEffects.push(potentialPrepEffect)

			if (growAmount <= 0) break;
		}

		if (growPrepEffects.length > 0) {
			endTime   = timings.growthEnd
			growJob = await createJob(ns, target, Tools.GROW, growPrepEffects, batchId, timings.growthStart, timings.growthEnd)
			jobs.push(growJob)
		}

		// We might still have room for the compensation weaken
		if (growAmount === 0) {
			const growThreads: number = growPrepEffects.reduce((total, prepEffect) => total + prepEffect.threads, 0)

			let weakenAmount: number = growThreads * CONSTANT.GROW_HARDENING
			const weakenPrepEffects: PrepEffect[] = []

			for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
				const potentialPrepEffect: PrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.WEAKEN, target, preppingServer, target.staticHackingProperties.minSecurityLevel + weakenAmount)

				if (potentialPrepEffect.threads === 0) continue;

				weakenAmount -= potentialPrepEffect.amount
				weakenPrepEffects.push(potentialPrepEffect)

				if (weakenAmount <= 0) break;
			}

			if (weakenPrepEffects.length > 0) {
				endTime   = timings.weakenEnd
				compensationWeakenJob = await createJob(ns, target, Tools.WEAKEN, weakenPrepEffects, batchId, timings.weakenStart, timings.weakenEnd)
				jobs.push(compensationWeakenJob)
			}
		}

	}

	if (jobs.length === 0) return; // All this work for nothing...

	// NOTE: Unfortunately we need this for type safety
	if (!startTime || !endTime) throw new Error('How the fuck do we not have timings available?')

	const batchJob: Batch = new Batch(ns, {
		batchId,
		target,
		jobs,
		start: startTime,
		end: endTime,
	})

	await JobAPI.startBatch(ns, batchJob)
}

export async function attackServer(ns: NS, target: HackableServer): Promise<void> {

	const cycleSpreads: CycleSpread[] = HackingCalculationUtils.computeCycleSpread(ns, target)

	const numCycles: number = cycleSpreads.reduce((total, cycleSpread) => total + cycleSpread.numCycles, 0)

	if (numCycles === 0) {
		LogAPI.printLog(ns, 'Skipped an attack.')
		return
	}

	const batchId: string = Utils.generateHash()
	const cycles: Cycle[] = []

	for (const cycleSpread of cycleSpreads) {
		for (let i = 0; i < cycleSpread.numCycles; i++) {
			const cycle: Cycle = await HackingCalculationUtils.scheduleCycle(ns, target, cycleSpread.source, batchId, cycles[cycles.length - 1])
			cycles.push(cycle)
		}
	}

	if (cycles.length === 0) {
		throw new Error('No cycles created')
	}

	const startTime: Date = cycles[0].weaken1.start
	const endTime: Date   = cycles[cycles.length - 1].weaken2.end

	const jobs: Job[] = cycles.reduce((array: Job[], cycle: Cycle) => [...array, cycle.hack, cycle.weaken1, cycle.growth, cycle.weaken2], [])

// Create the batch object
	const batchJob: Batch = new Batch(ns, {
		batchId,
		target,
		jobs,
		start: startTime,
		end: endTime,
	})

	await JobAPI.startBatch(ns, batchJob)
}

export async function optimizePerformance(ns: NS, target: HackableServer): Promise<void> {

	// PERFORMANCE: This is a very expensive function call

	// TODO: This does not seem to work properly?

	let performanceUpdated: boolean = false

	const hackingServers: Server[] = ServerAPI.getHackingServers(ns)

	const originalPercentageToSteal: number = target.percentageToSteal

	let optimalTarget: { percentageToSteal: number, profitsPerSecond: number; } = {
		percentageToSteal: CONSTANT.MIN_PERCENTAGE_TO_STEAL,
		profitsPerSecond: -1,
	}

	for (let n = CONSTANT.MIN_PERCENTAGE_TO_STEAL; n <= CONSTANT.MAX_PERCENTAGE_TO_STEAL; n += CONSTANT.DELTA_PERCENTAGE_TO_STEAL) {
		target.percentageToSteal = n
		const cycleSpreads: CycleSpread[] = HackingCalculationUtils.computeCycleSpread(ns, target, hackingServers)
		const numCycles: number = cycleSpreads.reduce((total, cycleSpread) => total + cycleSpread.numCycles, 0)
		const profit: number     = target.staticHackingProperties.maxMoney * target.percentageToSteal * numCycles

		const totalTime: number = HackingCalculationUtils.calculateTotalBatchTime(ns, target, numCycles)

		const profitsPerSecond: number = profit / totalTime

		if (profitsPerSecond > optimalTarget.profitsPerSecond) {
			optimalTarget = { percentageToSteal: n, profitsPerSecond }
		}
	}

	target.percentageToSteal = optimalTarget.percentageToSteal

	if (originalPercentageToSteal !== optimalTarget.percentageToSteal) performanceUpdated = true

	if (performanceUpdated) {
		LogAPI.printLog(ns, `Updated percentage to steal for ${target.characteristics.host} to ~${Math.round(target.percentageToSteal * 100)}%`)
	}
}