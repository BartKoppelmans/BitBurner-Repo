import type { BitBurner as NS } from "Bitburner";
import * as CodingContractAPI from "/src/api/CodingContractAPI.js";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as JobAPI from "/src/api/JobAPI.js";
import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as PurchasedServerAPI from "/src/api/PurchasedServerAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import BatchJob from "/src/classes/BatchJob.js";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import { Cycle } from "/src/interfaces/HackInterfaces.js";
import { ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as CycleUtils from "/src/util/CycleUtils.js";
import * as HackUtils from "/src/util/HackUtils.js";
import { Heuristics } from "/src/util/Heuristics.js";
import * as Utils from "/src/util/Utils.js";

let isHacking: boolean = false;
let hackLoopTimeout: ReturnType<typeof setTimeout>;

async function initialize(ns: NS) {

    Utils.disableLogging(ns);

    // NOTE: We wait until this is resolved before going on
    await ServerAPI.startServerManager(ns);

    // These will run in parallel
    const jobManagerReady: Promise<void> = JobAPI.startJobManager(ns);
    const programManagerReady: Promise<void> = ProgramAPI.startProgramManager(ns);
    const purchasedServerManagerReady: Promise<void> = PurchasedServerAPI.startPurchasedServerManager(ns);
    const codingContractManagerReady: Promise<void> = CodingContractAPI.startCodingContractManager(ns);

    // Wait until everything is initialized
    await Promise.allSettled([jobManagerReady, programManagerReady, purchasedServerManagerReady, codingContractManagerReady]);
}

async function hackLoop(ns: NS): Promise<void> {

    // Get the potential targets
    let potentialTargets: HackableServer[] = await ServerAPI.getTargetServers(ns);

    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.DiscordHeuristic);
    }));

    // We would have a problem if there are no targets
    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }

    // Sort the potential targets
    potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!);

    // Attack each of the targets
    for await (let target of potentialTargets) {

        while (isHacking) {
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }

        isHacking = true;

        let currentTargets: HackableServer[] = await ServerAPI.getCurrentTargets(ns);

        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
            isHacking = false;
            break;
        };

        await hack(ns, target);

        isHacking = false;
    }

    hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY);
}

async function hack(ns: NS, target: HackableServer): Promise<void> {
    // If it is prepping or targetting, leave it
    if (target.status !== ServerStatus.NONE) return;

    // The server is not optimal, so we have to prep it first
    if (!target.isOptimal(ns)) {
        await prepServer(ns, target);
        return;
    }

    // Make sure that the percentage that we steal is optimal
    await optimizePerformance(ns, target);

    await attackServer(ns, target);

    return;
}

async function prepServer(ns: NS, target: HackableServer): Promise<void> {

    // If the server is optimal, we are done I guess
    if (target.isOptimal(ns)) return;

    let initialWeakenJob: Job | undefined = undefined,
        growJob: Job | undefined = undefined,
        compensationWeakenJob: Job | undefined = undefined;

    let jobs: Job[] = [];

    let availableThreads: number = await HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true);

    if (availableThreads === 0) {
        if (CONSTANT.DEBUG_HACKING) Utils.tprintColored("Skipped a prep.", true, CONSTANT.COLOR_WARNING);
        return;
    }

    // TODO: Ideally we pick the server that can fit all our threads here immediately, 
    // then we can have everything on one source server

    if (target.needsWeaken(ns)) {
        let neededWeakenThreads: number = HackUtils.calculateWeakenThreads(ns, target);

        let weakenThreads: number = Math.min(neededWeakenThreads, availableThreads);

        availableThreads -= weakenThreads;

        initialWeakenJob = new Job(ns, {
            target,
            threads: weakenThreads,
            tool: Tools.WEAKEN,
            isPrep: true
        });

        jobs.push(initialWeakenJob);
    }

    // First grow, so that the amount of money is optimal
    if (target.needsGrow(ns)) {

        const neededGrowthThreads: number = HackUtils.calculateGrowthThreads(ns, target);
        const compensationWeakenThreads: number = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, neededGrowthThreads);

        const totalThreads: number = neededGrowthThreads + compensationWeakenThreads;

        const threadsFit: boolean = (totalThreads < availableThreads);

        // NOTE: This should be around 0.8, I think

        // NOTE: Here we do Math.floor, which could cause us not to ececute enought weakens/grows
        // However, we currently run into a lot of errors regarding too little threads available, which is why we do this.

        const growthThreads: number = (threadsFit) ? neededGrowthThreads : Math.floor(neededGrowthThreads * (availableThreads / totalThreads));
        const weakenThreads: number = (threadsFit) ? compensationWeakenThreads : Math.floor(compensationWeakenThreads * (availableThreads / totalThreads));

        availableThreads -= growthThreads + weakenThreads;

        if (growthThreads > 0 && weakenThreads > 0) {

            const weakenTime: number = target.getWeakenTime(ns);
            const growthTime: number = target.getGrowTime(ns);

            const firstStartTime: Date = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);

            let growthStartTime: Date, growthEndTime: Date, compensationWeakenEndTime: Date, compensationWeakenStartTime: Date;

            if ((growthTime + CONSTANT.JOB_DELAY) > weakenTime) {
                growthStartTime = new Date(firstStartTime.getTime());
                growthEndTime = new Date(growthStartTime.getTime() + growthTime);

                compensationWeakenEndTime = new Date(growthEndTime.getTime() + CONSTANT.JOB_DELAY);
                compensationWeakenStartTime = new Date(compensationWeakenEndTime.getTime() - weakenTime);
            } else {
                compensationWeakenStartTime = new Date(firstStartTime.getTime());
                compensationWeakenEndTime = new Date(compensationWeakenStartTime.getTime() + growthTime);

                growthEndTime = new Date(compensationWeakenEndTime.getTime() - CONSTANT.JOB_DELAY);
                growthStartTime = new Date(growthEndTime.getTime() - growthTime);
            }

            growJob = new Job(ns, {
                target,
                threads: growthThreads,
                tool: Tools.GROW,
                isPrep: true,
                start: growthStartTime,
                end: growthEndTime
            });

            compensationWeakenJob = new Job(ns, {
                target,
                threads: weakenThreads,
                tool: Tools.WEAKEN,
                isPrep: true,
                start: compensationWeakenStartTime,
                end: compensationWeakenEndTime
            });

            jobs.push(growJob);
            jobs.push(compensationWeakenJob);
        }
    }

    // We could not create any jobs, probably the RAM was already fully used. 
    // TODO: Filter this at the start, if we cannot start any threads, we should not even go here
    if (jobs.length === 0) return;

    const batchJob: BatchJob = new BatchJob(ns, {
        target,
        jobs
    });

    await JobAPI.communicateBatchJob(ns, batchJob);
}

async function attackServer(ns: NS, target: HackableServer): Promise<void> {

    const possibleCycles: number = await CycleUtils.computeCycles(ns, target);

    const cycles: number = Math.min(possibleCycles, CONSTANT.MAX_CYCLE_NUMBER);

    if (cycles === 0) {
        if (CONSTANT.DEBUG_HACKING) Utils.tprintColored("Skipped an attack.", true, CONSTANT.COLOR_WARNING);
        return;
    }

    let jobs: Job[] = [];
    let previousCycle: Cycle | undefined = undefined;

    for (let i = 0; i < cycles; i++) {
        let cycle: Cycle = CycleUtils.scheduleCycle(ns, target, previousCycle);
        jobs.push(cycle.hack);
        jobs.push(cycle.growth);
        jobs.push(cycle.weaken1);
        jobs.push(cycle.weaken2);

        previousCycle = cycle;

        await ns.sleep(CONSTANT.SMALL_DELAY);
    }

    if (jobs.length === 0) {
        throw new Error("No cycles created");
    }

    // Create the batch object
    const batchJob: BatchJob = new BatchJob(ns, {
        target,
        jobs
    });

    await JobAPI.communicateBatchJob(ns, batchJob);
}

async function optimizePerformance(ns: NS, target: HackableServer): Promise<void> {
    let performanceUpdated: boolean = false;

    let adjustment: number = 0.00;
    do {
        adjustment = await CycleUtils.analyzePerformance(ns, target);

        if (adjustment !== 0.00) {
            performanceUpdated = true;
            target.percentageToSteal += adjustment;
        }

        await ns.sleep(CONSTANT.SMALL_DELAY);
    } while (adjustment !== 0.00);

    if (performanceUpdated && CONSTANT.DEBUG_HACKING) {
        Utils.tprintColored(`Updated percentage to steal for ${target.characteristics.host} to ~${target.percentageToSteal * 100}%`, true, CONSTANT.COLOR_HACKING);
    }
}

export async function onDestroy(ns: NS) {
    clearTimeout(hackLoopTimeout);

    // TODO: Wait until it is done executing

    Utils.tprintColored("Stopping the daemon", true, CONSTANT.COLOR_INFORMATION);
}

export async function main(ns: NS) {

    const hostName: string = ns.getHostname();
    if (hostName !== "home") {
        throw new Error("Execute daemon script from home.");
    }

    Utils.tprintColored("Starting the daemon", true, CONSTANT.COLOR_INFORMATION);

    // TODO: Make a decision on whether we start the to-be-made early hacking scripts, 
    // or whether we want to start hacking using our main hacker

    await initialize(ns);

    hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY);


    // TODO: Here we should check whether we are still running the hackloop
    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasDaemonKillRequest(ns);

        if (shouldKill) {
            await onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}