import * as ServerAPI from "/src/api/ServerAPI.js";
import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
export async function computeCycles(ns, target) {
    const serverMap = await ServerAPI.getHackingServers(ns);
    const cycleCost = getOptimalBatchCost(ns, target);
    return Math.min(CONSTANT.MAX_CYCLE_NUMBER, serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0));
}
// Returns the number of threads
export function getOptimalBatchCost(ns, target) {
    const cycleThreads = determineCycleThreads(ns, target);
    const hackThreads = cycleThreads.hack;
    const growthThreads = cycleThreads.growth;
    const weakenThreads = cycleThreads.weaken1 + cycleThreads.weaken2;
    const hackCost = hackThreads * ToolUtils.getToolCost(ns, Tools.HACK);
    const growCost = growthThreads * ToolUtils.getToolCost(ns, Tools.GROW);
    const weakenCost = weakenThreads * ToolUtils.getToolCost(ns, Tools.WEAKEN);
    return hackCost + growCost + weakenCost;
}
export function scheduleCycle(ns, target, previousCycle) {
    let hackJob, weaken1Job, growthJob, weaken2Job;
    const cycleTimings = determineCycleTimings(ns, target, previousCycle);
    const cycleThreads = determineCycleThreads(ns, target);
    hackJob = new Job(ns, {
        target,
        tool: Tools.HACK,
        threads: cycleThreads.hack,
        start: cycleTimings.hack.start,
        end: cycleTimings.hack.end,
        isPrep: false
    });
    growthJob = new Job(ns, {
        target,
        tool: Tools.GROW,
        threads: cycleThreads.growth,
        start: cycleTimings.growth.start,
        end: cycleTimings.growth.end,
        isPrep: false
    });
    weaken1Job = new Job(ns, {
        target,
        tool: Tools.WEAKEN,
        threads: cycleThreads.weaken1,
        start: cycleTimings.weaken1.start,
        end: cycleTimings.weaken1.end,
        isPrep: false
    });
    weaken2Job = new Job(ns, {
        target,
        tool: Tools.WEAKEN,
        threads: cycleThreads.weaken2,
        start: cycleTimings.weaken2.start,
        end: cycleTimings.weaken2.end,
        isPrep: false
    });
    return {
        hack: hackJob,
        growth: growthJob,
        weaken1: weaken1Job,
        weaken2: weaken2Job
    };
}
function determineCycleTimings(ns, target, previousCycle) {
    const hackTime = target.getHackTime(ns);
    const weakenTime = target.getWeakenTime(ns);
    const growthTime = target.getGrowTime(ns);
    if (hackTime > weakenTime || growthTime > weakenTime) {
        throw new Error("We can't schedule a cycle where the weaken time is the longest.");
    }
    let weaken1Start, weaken1End, hackStart, hackEnd, growthStart, growthEnd, weaken2Start, weaken2End;
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
    const hackThreads = HackUtils.calculateHackThreads(ns, target);
    const growthThreads = HackUtils.calculateCompensationGrowthThreads(ns, target, hackThreads);
    const weaken1Threads = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads);
    const weaken2Threads = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads);
    return {
        hack: hackThreads,
        weaken1: weaken1Threads,
        growth: growthThreads,
        weaken2: weaken2Threads,
    };
}
