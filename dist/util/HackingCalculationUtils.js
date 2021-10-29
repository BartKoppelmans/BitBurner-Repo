import * as ServerAPI from '/src/api/ServerAPI.js';
import { CONSTANT, } from '/src/lib/constants.js';
import { Tools, } from '/src/tools/Tools.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import { CycleTask, } from '/src/classes/Misc/HackInterfaces.js';
import * as Utils from '/src/util/Utils.js';
import Job from '/src/classes/Job/Job.js';
export function computeCycleSpread(ns, target, servers) {
    if (!servers)
        servers = ServerAPI.getHackingServers(ns);
    let totalCycles = 0;
    const cycleSpreads = [];
    for (const source of servers) {
        const cycleCost = getOptimalCycleCost(ns, target, source);
        let numCycles = Math.floor(source.getAvailableRam(ns) / cycleCost);
        if (numCycles + totalCycles > CONSTANT.MAX_CYCLE_NUMBER) {
            numCycles = CONSTANT.MAX_CYCLE_NUMBER - totalCycles;
        }
        totalCycles += numCycles;
        if (numCycles > 0) {
            cycleSpreads.push({ source, numCycles });
        }
        if (totalCycles >= CONSTANT.MAX_CYCLE_NUMBER)
            break;
    }
    return cycleSpreads;
}
async function determineCycleThreadSpreads(ns, target, source, cycleThreads) {
    const cost = getOptimalCycleCost(ns, target, source);
    if (cost > source.getAvailableRam(ns)) {
        throw new Error('Not enough RAM available to create a cycle (on one server)');
    }
    await ServerAPI.increaseReservation(ns, source.characteristics.host, cost);
    const hackSpreadMap = new Map();
    const growthSpreadMap = new Map();
    const weaken1SpreadMap = new Map();
    const weaken2SpreadMap = new Map();
    hackSpreadMap.set(source.characteristics.host, cycleThreads.hack);
    growthSpreadMap.set(source.characteristics.host, cycleThreads.growth);
    weaken1SpreadMap.set(source.characteristics.host, cycleThreads.weaken1);
    weaken2SpreadMap.set(source.characteristics.host, cycleThreads.weaken2);
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
export function getOptimalCycleCost(ns, target, source) {
    const cycleThreads = determineCycleThreads(ns, target, source);
    const hackThreads = cycleThreads.hack;
    const growthThreads = cycleThreads.growth;
    const weakenThreads = cycleThreads.weaken1 + cycleThreads.weaken2;
    const hackCost = hackThreads * ToolUtils.getToolCost(ns, Tools.HACK);
    const growCost = growthThreads * ToolUtils.getToolCost(ns, Tools.GROW);
    const weakenCost = weakenThreads * ToolUtils.getToolCost(ns, Tools.WEAKEN);
    return hackCost + growCost + weakenCost;
}
export async function scheduleCycle(ns, target, source, batchId, previousCycle) {
    const cycleTimings = determineCycleTimings(ns, target, previousCycle);
    const cycleThreads = determineCycleThreads(ns, target, source);
    const cycleThreadSpreads = await determineCycleThreadSpreads(ns, target, source, cycleThreads);
    const cycleId = Utils.generateHash();
    const hackJob = new Job(ns, {
        batchId,
        cycleId,
        cycleTask: CycleTask.HACK,
        id: Utils.generateHash(),
        target,
        tool: Tools.HACK,
        threads: cycleThreads.hack,
        threadSpread: cycleThreadSpreads.hack,
        start: cycleTimings.hack.start,
        end: cycleTimings.hack.end,
        isPrep: false,
    });
    const weaken1Job = new Job(ns, {
        batchId,
        cycleId,
        cycleTask: CycleTask.WEAKEN1,
        id: Utils.generateHash(),
        target,
        tool: Tools.WEAKEN,
        threads: cycleThreads.weaken1,
        threadSpread: cycleThreadSpreads.weaken1,
        start: cycleTimings.weaken1.start,
        end: cycleTimings.weaken1.end,
        isPrep: false,
    });
    const growthJob = new Job(ns, {
        batchId,
        cycleId,
        cycleTask: CycleTask.GROWTH,
        id: Utils.generateHash(),
        target,
        tool: Tools.GROW,
        threads: cycleThreads.growth,
        threadSpread: cycleThreadSpreads.growth,
        start: cycleTimings.growth.start,
        end: cycleTimings.growth.end,
        isPrep: false,
    });
    const weaken2Job = new Job(ns, {
        batchId,
        cycleId,
        cycleTask: CycleTask.WEAKEN2,
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
function determineCycleThreads(ns, target, source) {
    const hackThreads = Math.max(1, Math.floor(calculateHackThreads(ns, target)));
    const weaken1Threads = Math.ceil(calculateCompensationWeakenThreads(ns, target, source, Tools.HACK, hackThreads));
    const growthThreads = Math.ceil(calculateCompensationGrowthThreads(ns, target, source, hackThreads));
    const weaken2Threads = Math.ceil(calculateCompensationWeakenThreads(ns, target, source, Tools.GROW, growthThreads));
    return {
        hack: hackThreads,
        weaken1: weaken1Threads,
        growth: growthThreads,
        weaken2: weaken2Threads,
    };
}
export function calculateHackThreads(ns, target) {
    const hackAmount = target.percentageToSteal * target.staticHackingProperties.maxMoney;
    return ns.hackAnalyzeThreads(target.characteristics.host, hackAmount);
}
export function calculatePotentialPrepEffect(ns, tool, target, source, start, goal) {
    const cost = ToolUtils.getToolCost(ns, tool);
    const availableThreads = Math.floor(source.getAvailableRam(ns) / cost);
    let neededThreads;
    if (tool === Tools.WEAKEN) {
        neededThreads = calculateWeakenThreads(ns, target, source, start, goal);
    }
    else if (tool === Tools.GROW) {
        neededThreads = calculateGrowthThreads(ns, target, source, start, goal);
    }
    else
        throw new Error('Incorrect setup');
    const threads = Math.min(availableThreads, neededThreads);
    let amount;
    if (tool === Tools.WEAKEN) {
        amount = calculateWeakenEffect(ns, target, source, threads);
    }
    else if (tool === Tools.GROW) {
        amount = calculateGrowthEffect(ns, target, source, threads, start);
    }
    else
        throw new Error('Incorrect setup');
    return { source, threads, amount };
}
export function calculateGrowthEffect(ns, target, source, threads, start = target.getMoney(ns)) {
    const targetServerObject = ns.getServer(target.characteristics.host);
    const sourceServerObject = ns.getServer(source.characteristics.host);
    const playerObject = PlayerUtils.getPlayer(ns);
    return start * ns.formulas.basic.growPercent(targetServerObject, threads, playerObject, sourceServerObject.cpuCores) - start;
}
export function calculateWeakenEffect(ns, target, source, threads) {
    const sourceServerObject = ns.getServer(source.characteristics.host);
    const coreBonus = 1 + (sourceServerObject.cpuCores - 1) / 16;
    return PlayerUtils.getWeakenPotency(ns) * coreBonus * threads;
}
export function calculateWeakenThreads(ns, target, source, start = target.getSecurityLevel(ns), goal = target.staticHackingProperties.minSecurityLevel) {
    const sourceServerObject = ns.getServer(source.characteristics.host);
    const coreBonus = 1 + (sourceServerObject.cpuCores - 1) / 16;
    return Math.ceil((start - goal) / (PlayerUtils.getWeakenPotency(ns) * coreBonus));
}
export function calculateGrowthThreads(ns, target, source, start = target.getMoney(ns), goal = target.staticHackingProperties.maxMoney) {
    // maxIterations prevents it from somehow looping indefinitely
    let guess = 1; // We can start with any number, really, but may as well make it simple.
    let previous = 0;
    let previous2 = 0; // The time before the time before; should identify cyclical outputs.
    let iteration = 0;
    const sourceServerObject = ns.getServer(source.characteristics.host);
    start = Math.max(0, start); // Can't start with <0 cash.
    if (start >= goal) {
        return 0; // Good news! You're already there.
    }
    for (iteration = 0; guess !== previous && iteration < CONSTANT.MAX_GROWTH_CALCULATION_ITERATIONS; ++iteration) {
        previous = guess;
        const ratio = goal / (start + guess);
        if (ratio > 1) {
            guess = Math.ceil(ns.growthAnalyze(target.characteristics.host, ratio, sourceServerObject.cpuCores));
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
export function calculateCompensationWeakenThreads(ns, target, source, after, threads) {
    const sourceServerObject = ns.getServer(source.characteristics.host);
    const coreBonus = 1 + (sourceServerObject.cpuCores - 1) / 16;
    switch (after) {
        case Tools.GROW:
            return Math.ceil(threads * CONSTANT.GROW_HARDENING / (PlayerUtils.getWeakenPotency(ns) * coreBonus));
        case Tools.HACK:
            return Math.ceil(threads * CONSTANT.HACK_HARDENING / (PlayerUtils.getWeakenPotency(ns) * coreBonus));
        default:
            throw new Error('We did not recognize the tool');
    }
}
// This is always after a hack
export function calculateCompensationGrowthThreads(ns, target, source, threads) {
    const hackAmount = ((threads * ns.hackAnalyzePercent(target.characteristics.host)) / 100) * target.staticHackingProperties.maxMoney;
    const startAmount = target.getMoney(ns) - hackAmount;
    return calculateGrowthThreads(ns, target, source, startAmount);
}
