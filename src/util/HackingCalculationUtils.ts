import type { BitBurner as NS } from 'Bitburner'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import Server                   from '/src/classes/Server/Server.js'
import { CONSTANT }             from '/src/lib/constants.js'
import { Tools }                from '/src/tools/Tools.js'
import * as PlayerUtils         from '/src/util/PlayerUtils.js'
import * as ToolUtils           from '/src/util/ToolUtils.js'
import {
	Cycle,
	CycleThreads,
	CycleThreadSpreads,
	CycleTimings,
	ThreadSpread,
}                               from '/src/classes/Misc/HackInterfaces.js'
import * as Utils               from '/src/util/Utils.js'
import Job                      from '/src/classes/Job/Job.js'

export async function computeCycles(ns: NS, target: HackableServer, servers?: Server[]): Promise<number> {

	if (!servers) servers = ServerAPI.getHackingServers(ns)
	const cycleCost: number = await getOptimalCycleCost(ns, target)

	return Math.max(0, Math.min(CONSTANT.MAX_CYCLE_NUMBER, servers.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0)))
}

async function determineCycleThreadSpreads(ns: NS, target: HackableServer, cycleThreads: CycleThreads): Promise<CycleThreadSpreads> {

	const serverList: Server[] = ServerAPI.getHackingServers(ns)

	// Get the server with the most available RAM
	const server = serverList[0]

	const cost: number = await getOptimalCycleCost(ns, target)
	if (cost > server.getAvailableRam(ns)) {
		throw new Error('Not enough RAM available to create a cycle (on one server)')
	}

	await ServerAPI.increaseReservation(ns, server.characteristics.host, cost)

	const hackSpreadMap: ThreadSpread    = new Map<string, number>()
	const growthSpreadMap: ThreadSpread  = new Map<string, number>()
	const weaken1SpreadMap: ThreadSpread = new Map<string, number>()
	const weaken2SpreadMap: ThreadSpread = new Map<string, number>()

	hackSpreadMap.set(server.characteristics.host, cycleThreads.hack)
	growthSpreadMap.set(server.characteristics.host, cycleThreads.growth)
	weaken1SpreadMap.set(server.characteristics.host, cycleThreads.weaken1)
	weaken2SpreadMap.set(server.characteristics.host, cycleThreads.weaken2)

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
export async function getOptimalCycleCost(ns: NS, target: HackableServer): Promise<number> {
	const cycleThreads: CycleThreads = determineCycleThreads(ns, target)

	const hackThreads: number   = cycleThreads.hack
	const growthThreads: number = cycleThreads.growth
	const weakenThreads: number = cycleThreads.weaken1 + cycleThreads.weaken2

	const hackCost: number   = hackThreads * await ToolUtils.getToolCost(ns, Tools.HACK)
	const growCost: number   = growthThreads * await ToolUtils.getToolCost(ns, Tools.GROW)
	const weakenCost: number = weakenThreads * await ToolUtils.getToolCost(ns, Tools.WEAKEN)

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
	const hackThreads: number    = Math.max(1, Math.floor(calculateHackThreads(ns, target)))
	const weaken1Threads: number = Math.ceil(calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads))
	const growthThreads: number  = Math.ceil(calculateCompensationGrowthThreads(ns, target, hackThreads))
	const weaken2Threads: number = Math.ceil(calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads))

	return {
		hack: hackThreads,
		weaken1: weaken1Threads,
		growth: growthThreads,
		weaken2: weaken2Threads,
	}
}

export async function computeThreadSpread(ns: NS, tool: Tools, threads: number, isPrep: boolean): Promise<ThreadSpread> {
	const maxThreadsAvailable = await calculateMaxThreads(ns, tool, isPrep)

	if (threads > maxThreadsAvailable) {
		throw new Error('We don\'t have that much threads available.')
	}

	const cost: number = await ToolUtils.getToolCost(ns, tool)

	let threadsLeft: number = threads

	const spreadMap: ThreadSpread = new Map<string, number>()

	const serverList: Server[] = (isPrep) ? ServerAPI.getPreppingServers(ns) : ServerAPI.getHackingServers(ns)

	for (const server of serverList) {
		const serverThreads: number = Math.floor(server.getAvailableRam(ns) / cost)

		// If we can't fit any more threads here, skip it
		if (serverThreads <= 0) continue

		// We can fit all our threads in here!
		if (serverThreads >= threadsLeft) {
			spreadMap.set(server.characteristics.host, threadsLeft)
			break
		}

		spreadMap.set(server.characteristics.host, serverThreads)
		threadsLeft -= serverThreads
	}
	return spreadMap
}

// Here we allow thread spreading over multiple servers
export async function calculateMaxThreads(ns: NS, tool: Tools, isPrep: boolean): Promise<number> {

	const serverList: Server[] = (isPrep) ? ServerAPI.getPreppingServers(ns) : ServerAPI.getHackingServers(ns)

	const cost: number = await ToolUtils.getToolCost(ns, tool)

	return serverList.reduce((threads, server) => {
		return threads + Math.floor(server.getAvailableRam(ns) / cost)
	}, 0)
}

export function calculateHackThreads(ns: NS, target: HackableServer): number {
	const hackAmount: number = target.percentageToSteal * target.staticHackingProperties.maxMoney
	return ns.hackAnalyzeThreads(target.characteristics.host, hackAmount)
}

export function calculateWeakenThreads(ns: NS, target: HackableServer, start = target.getSecurityLevel(ns), goal = target.staticHackingProperties.minSecurityLevel) {
	return Math.ceil((start - goal) / PlayerUtils.getWeakenPotency(ns))
}

export function calculateGrowthThreads(ns: NS, target: HackableServer, start = target.getMoney(ns), goal = target.staticHackingProperties.maxMoney) {
	// maxIterations prevents it from somehow looping indefinitely
	let guess     = 1  // We can start with any number, really, but may as well make it simple.
	let previous  = 0
	let previous2 = 0  // The time before the time before; should identify cyclical outputs.
	let iteration = 0

	start = Math.max(0, start)    // Can't start with <0 cash.
	if (start >= goal) {
		return 0   // Good news! You're already there.
	}
	for (iteration = 0; guess !== previous && iteration < CONSTANT.MAX_GROWTH_CALCULATION_ITERATIONS; ++iteration) {
		previous    = guess
		const ratio = goal / (start + guess)
		if (ratio > 1) {
			guess = Math.ceil(ns.growthAnalyze(target.characteristics.host, ratio))
		} else {
			guess = 1  // We'd only need 1 thread to meet the goal if adding the guess is sufficient to reach goal.
		}
		if (guess === previous2) {   // We got the same output we got the time before last.
			return Math.max(guess, previous)    // The smaller number of the two is obviously insufficient.
		}
		previous2 = previous
	}
	if (iteration >= CONSTANT.MAX_GROWTH_CALCULATION_ITERATIONS) {
		// Whatever the biggest of the last three values was should be a safe guess.
		return Math.max(guess, previous, previous2)
	}
	return guess   // It successfully stabilized!
}

export function calculateCompensationWeakenThreads(ns: NS, target: HackableServer, after: Tools, threads: number): number {
	switch (after) {
		case Tools.GROW:
			return Math.ceil(threads * CONSTANT.GROW_HARDENING / PlayerUtils.getWeakenPotency(ns))
		case Tools.HACK:
			return Math.ceil(threads * CONSTANT.HACK_HARDENING / PlayerUtils.getWeakenPotency(ns))
		default:
			throw new Error('We did not recognize the tool')
	}
}

// This is always after a hack
export function calculateCompensationGrowthThreads(ns: NS, target: HackableServer, threads: number): number {
	const hackAmount: number  = ((threads * ns.hackAnalyzePercent(target.characteristics.host)) / 100) * target.staticHackingProperties.maxMoney
	const startAmount: number = target.getMoney(ns) - hackAmount

	return calculateGrowthThreads(ns, target, startAmount)
}