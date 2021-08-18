import * as ServerAPI from '/src/api/ServerAPI.js';
import Job from '/src/classes/Job/Job.js';
import { CONSTANT } from '/src/lib/constants.js';
import { Tools } from '/src/tools/Tools.js';
import * as HackUtils from '/src/util/HackUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import * as Utils from '/src/util/Utils.js';
export function computeCycles(ns, target) {
    const serverMap = ServerAPI.getHackingServers(ns);
    const cycleCost = getOptimalCycleCost(ns, target);
    return Math.max(0, Math.min(CONSTANT.MAX_CYCLE_NUMBER, serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0)));
}
function determineCycleThreadSpreads(ns, target, cycleThreads) {
    const serverList = ServerAPI.getHackingServers(ns);
    // Get the server with the most available RAM
    const server = serverList[0];
    const cost = getOptimalCycleCost(ns, target);
    if (cost > server.getAvailableRam(ns)) {
        throw new Error('Not enough RAM available to create a cycle (on one server)');
    }
    const hackSpreadMap = new Map();
    const growthSpreadMap = new Map();
    const weaken1SpreadMap = new Map();
    const weaken2SpreadMap = new Map();
    hackSpreadMap.set(server, cycleThreads.hack);
    growthSpreadMap.set(server, cycleThreads.growth);
    weaken1SpreadMap.set(server, cycleThreads.weaken1);
    weaken2SpreadMap.set(server, cycleThreads.weaken2);
    ServerAPI.increaseReservation(ns, server, cost);
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
export function getOptimalCycleCost(ns, target) {
    const cycleThreads = determineCycleThreads(ns, target);
    const hackThreads = cycleThreads.hack;
    const growthThreads = cycleThreads.growth;
    const weakenThreads = cycleThreads.weaken1 + cycleThreads.weaken2;
    const hackCost = hackThreads * ToolUtils.getToolCost(ns, Tools.HACK);
    const growCost = growthThreads * ToolUtils.getToolCost(ns, Tools.GROW);
    const weakenCost = weakenThreads * ToolUtils.getToolCost(ns, Tools.WEAKEN);
    return hackCost + growCost + weakenCost;
}
export function scheduleCycle(ns, target, batchId, previousCycle) {
    const cycleTimings = determineCycleTimings(ns, target, previousCycle);
    const cycleThreads = determineCycleThreads(ns, target);
    const cycleThreadSpreads = determineCycleThreadSpreads(ns, target, cycleThreads);
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
    const hackThreads = Math.max(1, Math.floor(HackUtils.calculateHackThreads(ns, target)));
    const weaken1Threads = Math.ceil(HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads));
    const growthThreads = Math.ceil(HackUtils.calculateCompensationGrowthThreads(ns, target, hackThreads));
    const weaken2Threads = Math.ceil(HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads));
    return {
        hack: hackThreads,
        weaken1: weaken1Threads,
        growth: growthThreads,
        weaken2: weaken2Threads,
    };
}
