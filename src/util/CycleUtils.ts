import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";
import { Cycle, CycleThreads, CycleTimings } from "/src/interfaces/HackInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";

export async function analyzePerformance(ns: NS, target: HackableServer): Promise<number> {

    const cycles: number = await computeCycles(ns, target);

    const isMin: boolean = Math.floor(target.percentageToSteal) <= CONSTANT.MIN_PERCENTAGE_TO_STEAL;
    const isMax: boolean = Math.floor(target.percentageToSteal) >= CONSTANT.MAX_PERCENTAGE_TO_STEAL;

    if (cycles < CONSTANT.DESIRED_CYCLE_NUMBER && !isMin) return -0.01;
    else if (cycles < CONSTANT.DESIRED_CYCLE_NUMBER && isMin) return 0.00;
    else if (cycles > CONSTANT.DESIRED_CYCLE_NUMBER && isMax) return 0.00;
    else if (cycles > CONSTANT.DESIRED_CYCLE_NUMBER && !isMax) return 0.01;
    else return 0.00;
}

export async function computeCycles(ns: NS, target: HackableServer): Promise<number> {

    const serverMap: Server[] = await ServerAPI.getHackingServers(ns);
    const cycleCost: number = getOptimalBatchCost(ns, target);

    return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0);
}

// Returns the number of threads
export function getOptimalBatchCost(ns: NS, target: HackableServer): number {
    const cycleThreads: CycleThreads = determineCycleThreads(ns, target);

    const hackThreads: number = cycleThreads.hack;
    const growthThreads: number = cycleThreads.growth;
    const weakenThreads: number = cycleThreads.weaken1 + cycleThreads.weaken2;

    const hackCost: number = hackThreads * ToolUtils.getToolCost(ns, Tools.HACK);
    const growCost: number = growthThreads * ToolUtils.getToolCost(ns, Tools.GROW);
    const weakenCost: number = weakenThreads * ToolUtils.getToolCost(ns, Tools.WEAKEN);

    return hackCost + growCost + weakenCost;
}


export function scheduleCycle(ns: NS, target: HackableServer, previousCycle?: Cycle): Cycle {

    let hackJob: Job, weaken1Job: Job, growthJob: Job, weaken2Job: Job;

    const cycleTimings: CycleTimings = determineCycleTimings(ns, target, previousCycle);
    const cycleThreads: CycleThreads = determineCycleThreads(ns, target);

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

function determineCycleTimings(ns: NS, target: HackableServer, previousCycle?: Cycle): CycleTimings {
    const hackTime: number = target.getHackTime(ns);
    const weakenTime: number = target.getWeakenTime(ns);
    const growthTime: number = target.getGrowTime(ns);

    if (hackTime > weakenTime || growthTime > weakenTime) {
        throw new Error("We can't schedule a cycle where the weaken time is the longest.");
    }

    let weaken1Start: Date, weaken1End: Date, hackStart: Date, hackEnd: Date,
        growthStart: Date, growthEnd: Date, weaken2Start: Date, weaken2End: Date;

    if (previousCycle) {
        hackEnd = new Date(previousCycle.weaken2.end.getTime() + CONSTANT.JOB_DELAY + CONSTANT.CYCLE_DELAY);
        hackStart = new Date(hackEnd.getTime() - hackTime);

        weaken1End = new Date(hackEnd.getTime() + CONSTANT.JOB_DELAY);
        weaken1Start = new Date(weaken1End.getTime() - weakenTime);

        growthEnd = new Date(weaken1End.getTime() + CONSTANT.JOB_DELAY);
        growthStart = new Date(growthEnd.getTime() - weakenTime);

        weaken2End = new Date(growthEnd.getTime() + CONSTANT.JOB_DELAY);
        weaken2Start = new Date(weaken2End.getTime() - weakenTime);

    } else {
        const startTime: Date = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);

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

function determineCycleThreads(ns: NS, target: HackableServer): CycleThreads {
    const hackThreads: number = HackUtils.calculateHackThreads(ns, target);
    const growthThreads: number = HackUtils.calculateCompensationGrowthThreads(ns, target, hackThreads);
    const weaken1Threads: number = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.HACK, hackThreads);
    const weaken2Threads: number = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, growthThreads);

    return {
        hack: hackThreads,
        weaken1: weaken1Threads,
        growth: growthThreads,
        weaken2: weaken2Threads,
    };
}