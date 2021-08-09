import type { BitBurner as NS }                                  from 'Bitburner'
import * as ServerAPI                                            from '/src/api/ServerAPI.js'
import HackableServer                                            from '/src/classes/HackableServer.js'
import Job                                                       from '/src/classes/Job.js'
import Server                                                    from '/src/classes/Server.js'
import { Cycle, CycleThreads, CycleThreadSpreads, CycleTimings } from '/src/interfaces/HackInterfaces.js'
import { CONSTANT }                                              from '/src/lib/constants.js'
import { Tools }                                                 from '/src/tools/Tools.js'
import * as HackUtils                                            from '/src/util/HackUtils.js'
import * as ToolUtils                                            from '/src/util/ToolUtils.js'
import * as Utils                                                from '/src/util/Utils.js'
import { ServerList }                                            from '/src/interfaces/ServerInterfaces.js'

export async function computeCycles(ns: NS, target: HackableServer): Promise<number> {

	const serverMap: Server[] = await ServerAPI.getHackingServers(ns)
	const cycleCost: number   = getOptimalCycleCost(ns, target)

	return Math.min(CONSTANT.MAX_CYCLE_NUMBER, serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0))
}

export async function determineCycleThreadSpreads(ns: NS, target: HackableServer, cycleThreads: CycleThreads): Promise<CycleThreadSpreads> {

	const serverList: ServerList = await ServerAPI.getHackingServers(ns)

	// Get the server with the most available RAM
	const server = serverList[0]

	const cost: number = getOptimalCycleCost(ns, target)
	if (cost > server.getAvailableRam(ns)) {
		throw new Error('Not enough RAM available to create a cycle (on one server)')
	}

	const hackSpreadMap: Map<Server, number>    = new Map<Server, number>()
	const growthSpreadMap: Map<Server, number>  = new Map<Server, number>()
	const weaken1SpreadMap: Map<Server, number> = new Map<Server, number>()
	const weaken2SpreadMap: Map<Server, number> = new Map<Server, number>()

	hackSpreadMap.set(server, cycleThreads.hack)
	growthSpreadMap.set(server, cycleThreads.growth)
	weaken1SpreadMap.set(server, cycleThreads.weaken1)
	weaken2SpreadMap.set(server, cycleThreads.weaken2)

	await ServerAPI.increaseReservation(ns, server, cost)

	return {
		hack: hackSpreadMap,
		weaken1: weaken1SpreadMap,
		growth: growthSpreadMap,
		weaken2: weaken2SpreadMap,
	}
}

export function calculateTotalBatchTime(ns: NS, target: HackableServer, numCycles: number): number {
	if (numCycles === 0) {
		return 0
	}

	const firstCycleTime: number      = target.getWeakenTime(ns) + 3 * CONSTANT.JOB_DELAY
	const sequentialCycleTime: number = CONSTANT.CYCLE_DELAY + 3 * CONSTANT.JOB_DELAY

	if (numCycles === 1) return firstCycleTime
	else {
		return firstCycleTime + ((numCycles - 1) * sequentialCycleTime)
	}
}

// Returns the number of threads
export function getOptimalCycleCost(ns: NS, target: HackableServer): number {
	const cycleThreads: CycleThreads = determineCycleThreads(ns, target)

	const hackThreads: number   = cycleThreads.hack
	const growthThreads: number = cycleThreads.growth
	const weakenThreads: number = cycleThreads.weaken1 + cycleThreads.weaken2

	const hackCost: number   = hackThreads * ToolUtils.getToolCost(ns, Tools.HACK)
	const growCost: number   = growthThreads * ToolUtils.getToolCost(ns, Tools.GROW)
	const weakenCost: number = weakenThreads * ToolUtils.getToolCost(ns, Tools.WEAKEN)

	return hackCost + growCost + weakenCost
}


export async function scheduleCycle(ns: NS, target: HackableServer, batchId: string, previousCycle?: Cycle): Promise<Cycle> {

	const cycleTimings: CycleTimings             = determineCycleTimings(ns, target, previousCycle)
	const cycleThreads: CycleThreads             = determineCycleThreads(ns, target)
	const cycleThreadSpreads: CycleThreadSpreads = await determineCycleThreadSpreads(ns, target, cycleThreads)
	const cycleId: string                        = Utils.generateHash()

	const hackJob = new Job(ns, {
		batchId,
		cycleId,
		id: Utils.generateHash(),
		target,
		tool: Tools.HACK,
		threads: cycleThreads.hack,
		threadSpread: cycleThreadSpreads.hack,
		start: cycleTimings.hack.start,
		end: cycleTimings.hack.end,
		isPrep: false,
	})

	const growthJob = new Job(ns, {
		batchId,
		cycleId,
		id: Utils.generateHash(),
		target,
		tool: Tools.GROW,
		threads: cycleThreads.growth,
		threadSpread: cycleThreadSpreads.growth,
		start: cycleTimings.growth.start,
		end: cycleTimings.growth.end,
		isPrep: false,
	})

	const weaken1Job = new Job(ns, {
		batchId,
		cycleId,
		id: Utils.generateHash(),
		target,
		tool: Tools.WEAKEN,
		threads: cycleThreads.weaken1,
		threadSpread: cycleThreadSpreads.weaken1,
		start: cycleTimings.weaken1.start,
		end: cycleTimings.weaken1.end,
		isPrep: false,
	})

	const weaken2Job = new Job(ns, {
		batchId,
		cycleId,
		id: Utils.generateHash(),
		target,
		tool: Tools.WEAKEN,
		threads: cycleThreads.weaken2,
		threadSpread: cycleThreadSpreads.weaken2,
		start: cycleTimings.weaken2.start,
		end: cycleTimings.weaken2.end,
		isPrep: false,
	})

	return {
		hack: hackJob,
		growth: growthJob,
		weaken1: weaken1Job,
		weaken2: weaken2Job,
	}
}

function determineCycleTimings(ns: NS, target: HackableServer, previousCycle?: Cycle): CycleTimings {
	const hackTime: number   = target.getHackTime(ns)
	const weakenTime: number = target.getWeakenTime(ns)
	const growthTime: number = target.getGrowTime(ns)

	if (hackTime > weakenTime || growthTime > weakenTime) {
		throw new Error('We can\'t schedule a cycle where the weaken time is the longest.')
	}

	let weaken1Start: Date
	let weaken1End: Date
	let hackStart: Date
	let hackEnd: Date
	let growthStart: Date
	let growthEnd: Date
	let weaken2Start: Date
	let weaken2End: Date

	if (previousCycle) {
		hackEnd   = new Date(previousCycle.weaken2.end.getTime() + CONSTANT.JOB_DELAY + CONSTANT.CYCLE_DELAY)
		hackStart = new Date(hackEnd.getTime() - hackTime)

		weaken1End   = new Date(hackEnd.getTime() + CONSTANT.JOB_DELAY)
		weaken1Start = new Date(weaken1End.getTime() - weakenTime)

		growthEnd   = new Date(weaken1End.getTime() + CONSTANT.JOB_DELAY)
		growthStart = new Date(growthEnd.getTime() - weakenTime)

		weaken2End   = new Date(growthEnd.getTime() + CONSTANT.JOB_DELAY)
		weaken2Start = new Date(weaken2End.getTime() - weakenTime)

	} else {
		const startTime: Date = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY)

		// Start with the first weaken, which we will use as the guideline for the others
		weaken1Start = new Date(startTime.getTime())
		weaken1End   = new Date(startTime.getTime() + weakenTime)

		// The hack should be the first to resolve
		hackEnd   = new Date(weaken1End.getTime() - CONSTANT.JOB_DELAY)
		hackStart = new Date(hackEnd.getTime() - hackTime)

		// The growth should go after the first weaken
		growthEnd   = new Date(weaken1End.getTime() + CONSTANT.JOB_DELAY)
		growthStart = new Date(growthEnd.getTime() - growthTime)

		// Finally, another weaken to compensate for the growth
		weaken2End   = new Date(weaken1End.getTime() + 2 * CONSTANT.JOB_DELAY)
		weaken2Start = new Date(weaken2End.getTime() - weakenTime)
	}

	return {
		hack: { start: hackStart, end: hackEnd },
		weaken1: { start: weaken1Start, end: weaken1End },
		growth: { start: growthStart, end: growthEnd },
		weaken2: { start: weaken2Start, end: weaken2End },
	}
}

function determineCycleThreads(ns: NS, target: HackableServer): CycleThreads {
	const hackThreads: number    = Math.max(1, Math.floor(HackUtils.calculateHackThreads(ns, target)))
	const weaken1Threads: number = Math.ceil(HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads))
	const growthThreads: number  = Math.ceil(HackUtils.calculateCompensationGrowthThreads(ns, target, hackThreads))
	const weaken2Threads: number = Math.ceil(HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads))

	return {
		hack: hackThreads,
		weaken1: weaken1Threads,
		growth: growthThreads,
		weaken2: weaken2Threads,
	}
}