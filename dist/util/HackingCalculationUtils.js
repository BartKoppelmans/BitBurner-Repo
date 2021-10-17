import * as ServerAPI from '/src/api/ServerAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import { Tools } from '/src/tools/Tools.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import * as Utils from '/src/util/Utils.js';
import Job from '/src/classes/Job/Job.js';
export async function computeCycles(ns, target, servers) {
    if (!servers)
        servers = ServerAPI.getHackingServers(ns);
    const cycleCost = await getOptimalCycleCost(ns, target);
    return Math.max(0, Math.min(CONSTANT.MAX_CYCLE_NUMBER, servers.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0)));
}
async function determineCycleThreadSpreads(ns, target, cycleThreads) {
    const serverList = ServerAPI.getHackingServers(ns);
    // Get the server with the most available RAM
    const server = serverList[0];
    const cost = await getOptimalCycleCost(ns, target);
    if (cost > server.getAvailableRam(ns)) {
        throw new Error('Not enough RAM available to create a cycle (on one server)');
    }
    await ServerAPI.increaseReservation(ns, server.characteristics.host, cost);
    const hackSpreadMap = new Map();
    const growthSpreadMap = new Map();
    const weaken1SpreadMap = new Map();
    const weaken2SpreadMap = new Map();
    hackSpreadMap.set(server.characteristics.host, cycleThreads.hack);
    growthSpreadMap.set(server.characteristics.host, cycleThreads.growth);
    weaken1SpreadMap.set(server.characteristics.host, cycleThreads.weaken1);
    weaken2SpreadMap.set(server.characteristics.host, cycleThreads.weaken2);
    return {
        hack: hackSpreadMap,
        weaken1: weaken1SpreadMap,
        growth: growthSpreadMap,
        weaken2: weaken2SpreadMap,
    };
}
export function calculateTotalBatchTime(ns, target, numCycles) {
    if (numCycles === 0) {
        return 0;
    }
    const firstCycleTime = target.getWeakenTime(ns) + 3 * CONSTANT.JOB_DELAY;
    const sequentialCycleTime = CONSTANT.CYCLE_DELAY + 3 * CONSTANT.JOB_DELAY;
    if (numCycles === 1)
        return firstCycleTime;
    else {
        return firstCycleTime + ((numCycles - 1) * sequentialCycleTime);
    }
}
// Returns the number of threads
export async function getOptimalCycleCost(ns, target) {
    const cycleThreads = determineCycleThreads(ns, target);
    const hackThreads = cycleThreads.hack;
    const growthThreads = cycleThreads.growth;
    const weakenThreads = cycleThreads.weaken1 + cycleThreads.weaken2;
    const hackCost = hackThreads * await ToolUtils.getToolCost(ns, Tools.HACK);
    const growCost = growthThreads * await ToolUtils.getToolCost(ns, Tools.GROW);
    const weakenCost = weakenThreads * await ToolUtils.getToolCost(ns, Tools.WEAKEN);
    return hackCost + growCost + weakenCost;
}
export async function scheduleCycle(ns, target, batchId, previousCycle) {
    const cycleTimings = determineCycleTimings(ns, target, previousCycle);
    const cycleThreads = determineCycleThreads(ns, target);
    const cycleThreadSpreads = await determineCycleThreadSpreads(ns, target, cycleThreads);
    const cycleId = Utils.generateHash();
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
    });
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
    });
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
    });
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
    });
    return {
        hack: hackJob,
        growth: growthJob,
        weaken1: weaken1Job,
        weaken2: weaken2Job,
    };
}
function determineCycleTimings(ns, target, previousCycle) {
    const hackTime = target.getHackTime(ns);
    const weakenTime = target.getWeakenTime(ns);
    const growthTime = target.getGrowTime(ns);
    if (hackTime > weakenTime || growthTime > weakenTime) {
        throw new Error('We can\'t schedule a cycle where the weaken time is the longest.');
    }
    let weaken1Start;
    let weaken1End;
    let hackStart;
    let hackEnd;
    let growthStart;
    let growthEnd;
    let weaken2Start;
    let weaken2End;
    if (previousCycle) {
        hackEnd = new Date(previousCycle.weaken2.end.getTime() + CONSTANT.JOB_DELAY + CONSTANT.CYCLE_DELAY);
        hackStart = new Date(hackEnd.getTime() - hackTime);
        weaken1End = new Date(hackEnd.getTime() + CONSTANT.JOB_DELAY);
        weaken1Start = new Date(weaken1End.getTime() - weakenTime);
        growthEnd = new Date(weaken1End.getTime() + CONSTANT.JOB_DELAY);
        growthStart = new Date(growthEnd.getTime() - weakenTime);
        weaken2End = new Date(growthEnd.getTime() + CONSTANT.JOB_DELAY);
        weaken2Start = new Date(weaken2End.getTime() - weakenTime);
    }
    else {
        const startTime = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
        // Start with the first weaken, which we will use as the guideline for the others
        weaken1Start = new Date(startTime.getTime());
        weaken1End = new Date(startTime.getTime() + weakenTime);
        // The hack should be the first to resolve
        hackEnd = new Date(weaken1End.getTime() - CONSTANT.JOB_DELAY);
        hackStart = new Date(hackEnd.getTime() - hackTime);
        // The growth should go after the first weaken
        growthEnd = new Date(weaken1End.getTime() + CONSTANT.JOB_DELAY);
        growthStart = new Date(growthEnd.getTime() - growthTime);
        // Finally, another weaken to compensate for the growth
        weaken2End = new Date(weaken1End.getTime() + 2 * CONSTANT.JOB_DELAY);
        weaken2Start = new Date(weaken2End.getTime() - weakenTime);
    }
    return {
        hack: { start: hackStart, end: hackEnd },
        weaken1: { start: weaken1Start, end: weaken1End },
        growth: { start: growthStart, end: growthEnd },
        weaken2: { start: weaken2Start, end: weaken2End },
    };
}
function determineCycleThreads(ns, target) {
    const hackThreads = Math.max(1, Math.floor(calculateHackThreads(ns, target)));
    const weaken1Threads = Math.ceil(calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads));
    const growthThreads = Math.ceil(calculateCompensationGrowthThreads(ns, target, hackThreads));
    const weaken2Threads = Math.ceil(calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads));
    return {
        hack: hackThreads,
        weaken1: weaken1Threads,
        growth: growthThreads,
        weaken2: weaken2Threads,
    };
}
export async function computeThreadSpread(ns, tool, threads, isPrep) {
    const maxThreadsAvailable = await calculateMaxThreads(ns, tool, isPrep);
    if (threads > maxThreadsAvailable) {
        throw new Error('We don\'t have that much threads available.');
    }
    const cost = await ToolUtils.getToolCost(ns, tool);
    let threadsLeft = threads;
    const spreadMap = new Map();
    const serverList = (isPrep) ? ServerAPI.getPreppingServers(ns) : ServerAPI.getHackingServers(ns);
    for (const server of serverList) {
        const serverThreads = Math.floor(server.getAvailableRam(ns) / cost);
        // If we can't fit any more threads here, skip it
        if (serverThreads <= 0)
            continue;
        // We can fit all our threads in here!
        if (serverThreads >= threadsLeft) {
            spreadMap.set(server.characteristics.host, threadsLeft);
            break;
        }
        spreadMap.set(server.characteristics.host, serverThreads);
        threadsLeft -= serverThreads;
    }
    return spreadMap;
}
// Here we allow thread spreading over multiple servers
export async function calculateMaxThreads(ns, tool, isPrep) {
    const serverList = (isPrep) ? ServerAPI.getPreppingServers(ns) : ServerAPI.getHackingServers(ns);
    const cost = await ToolUtils.getToolCost(ns, tool);
    return serverList.reduce((threads, server) => {
        return threads + Math.floor(server.getAvailableRam(ns) / cost);
    }, 0);
}
export function calculateHackThreads(ns, target) {
    const hackAmount = target.percentageToSteal * target.staticHackingProperties.maxMoney;
    return ns.hackAnalyzeThreads(target.characteristics.host, hackAmount);
}
export function calculateWeakenThreads(ns, target, start = target.getSecurityLevel(ns), goal = target.staticHackingProperties.minSecurityLevel) {
    return Math.ceil((start - goal) / PlayerUtils.getWeakenPotency(ns));
}
export function calculateGrowthThreads(ns, target, start = target.getMoney(ns), goal = target.staticHackingProperties.maxMoney) {
    // maxIterations prevents it from somehow looping indefinitely
    let guess = 1; // We can start with any number, really, but may as well make it simple.
    let previous = 0;
    let previous2 = 0; // The time before the time before; should identify cyclical outputs.
    let iteration = 0;
    start = Math.max(0, start); // Can't start with <0 cash.
    if (start >= goal) {
        return 0; // Good news! You're already there.
    }
    for (iteration = 0; guess !== previous && iteration < CONSTANT.MAX_GROWTH_CALCULATION_ITERATIONS; ++iteration) {
        previous = guess;
        const ratio = goal / (start + guess);
        if (ratio > 1) {
            guess = Math.ceil(ns.growthAnalyze(target.characteristics.host, ratio));
        }
        else {
            guess = 1; // We'd only need 1 thread to meet the goal if adding the guess is sufficient to reach goal.
        }
        if (guess === previous2) { // We got the same output we got the time before last.
            return Math.max(guess, previous); // The smaller number of the two is obviously insufficient.
        }
        previous2 = previous;
    }
    if (iteration >= CONSTANT.MAX_GROWTH_CALCULATION_ITERATIONS) {
        // Whatever the biggest of the last three values was should be a safe guess.
        return Math.max(guess, previous, previous2);
    }
    return guess; // It successfully stabilized!
}
export function calculateCompensationWeakenThreads(ns, target, after, threads) {
    switch (after) {
        case Tools.GROW:
            return Math.ceil(threads * CONSTANT.GROW_HARDENING / PlayerUtils.getWeakenPotency(ns));
        case Tools.HACK:
            return Math.ceil(threads * CONSTANT.HACK_HARDENING / PlayerUtils.getWeakenPotency(ns));
        default:
            throw new Error('We did not recognize the tool');
    }
}
// This is always after a hack
export function calculateCompensationGrowthThreads(ns, target, threads) {
    const hackAmount = ((threads * ns.hackAnalyzePercent(target.characteristics.host)) / 100) * target.staticHackingProperties.maxMoney;
    const startAmount = target.getMoney(ns) - hackAmount;
    return calculateGrowthThreads(ns, target, startAmount);
}
