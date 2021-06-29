import * as CodingContractAPI from "/src/api/CodingContractAPI.js";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as JobAPI from "/src/api/JobAPI.js";
import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as PurchasedServerAPI from "/src/api/PurchasedServerAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import BatchJob from "/src/classes/BatchJob.js";
import Job from "/src/classes/Job.js";
import { ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as CycleUtils from "/src/util/CycleUtils.js";
import * as HackUtils from "/src/util/HackUtils.js";
import { Heuristics } from "/src/util/Heuristics.js";
import * as Utils from "/src/util/Utils.js";
let isHacking = false;
let hackLoopInterval;
async function initialize(ns) {
    Utils.disableLogging(ns);
    // NOTE: We wait until this is resolved before going on
    await ServerAPI.startServerManager(ns);
    // These will run in parallel
    const jobManagerReady = JobAPI.startJobManager(ns);
    const programManagerReady = ProgramAPI.startProgramManager(ns);
    const purchasedServerManagerReady = PurchasedServerAPI.startPurchasedServerManager(ns);
    const codingContractManagerReady = CodingContractAPI.startCodingContractManager(ns);
    // Wait until everything is initialized
    await Promise.allSettled([jobManagerReady, programManagerReady, purchasedServerManagerReady, codingContractManagerReady]);
}
async function hackLoop(ns) {
    // Get the potential targets
    let potentialTargets = await ServerAPI.getTargetServers(ns);
    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));
    // We would have a problem if there are no targets
    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }
    // Sort the potential targets
    potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
    // Attack each of the targets
    for await (let target of potentialTargets) {
        while (isHacking) {
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }
        isHacking = true;
        let currentTargets = await ServerAPI.getCurrentTargets(ns);
        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
            isHacking = false;
            break;
        }
        ;
        await hack(ns, target);
        isHacking = false;
    }
}
async function hack(ns, target) {
    // If it is prepping or targetting, leave it
    if (target.status !== ServerStatus.NONE)
        return;
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
async function prepServer(ns, target) {
    // If the server is optimal, we are done I guess
    if (target.isOptimal(ns))
        return;
    let initialWeakenJob = undefined, growJob = undefined, compensationWeakenJob = undefined;
    let jobs = [];
    // TODO: Ideally we pick the server that can fit all our threads here immediately, 
    // then we can have everything on one source server
    if (target.needsWeaken(ns)) {
        let neededWeakenThreads = HackUtils.calculateWeakenThreads(ns, target);
        let maxWeakenThreads = await HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true);
        let weakenThreads = Math.min(neededWeakenThreads, maxWeakenThreads);
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
        // NOTE: Here we assume that the max number of growth and weaken threads is the same
        const availableThreads = await HackUtils.calculateMaxThreads(ns, Tools.GROW, true);
        const neededGrowthThreads = HackUtils.calculateGrowthThreads(ns, target);
        const compensationWeakenThreads = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, neededGrowthThreads);
        const totalThreads = neededGrowthThreads + compensationWeakenThreads;
        const threadsFit = (totalThreads < availableThreads);
        // NOTE: This should be around 0.8, I think
        const growthThreads = (threadsFit) ? neededGrowthThreads : Math.ceil(neededGrowthThreads * (availableThreads / totalThreads));
        const weakenThreads = (threadsFit) ? compensationWeakenThreads : Math.ceil(compensationWeakenThreads * (availableThreads / totalThreads));
        if (growthThreads > 0 && weakenThreads > 0) {
            const growthStartTime = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : undefined;
            growJob = new Job(ns, {
                target,
                threads: growthThreads,
                tool: Tools.GROW,
                isPrep: true,
                start: growthStartTime
            });
            const compensationWeakenStartTime = new Date(growJob.end.getTime() + CONSTANT.JOB_DELAY);
            compensationWeakenJob = new Job(ns, {
                target,
                threads: weakenThreads,
                tool: Tools.WEAKEN,
                isPrep: true,
                start: compensationWeakenStartTime
            });
            jobs.push(growJob);
            jobs.push(compensationWeakenJob);
        }
    }
    // We could not create any jobs, probably the RAM was already fully used. 
    // TODO: Filter this at the start, if we cannot start any threads, we should not even go here
    if (jobs.length === 0)
        return;
    const batchJob = new BatchJob(ns, {
        target,
        jobs
    });
    await JobAPI.communicateBatchJob(ns, batchJob);
}
async function attackServer(ns, target) {
    const cycles = await CycleUtils.computeCycles(ns, target);
    if (cycles === 0) {
        if (CONSTANT.DEBUG_HACKING)
            Utils.tprintColored("Skipped an attack.", true, CONSTANT.COLOR_WARNING);
        return;
    }
    let jobs = [];
    let previousCycle = undefined;
    for (let i = 0; i < cycles; i++) {
        let cycle = CycleUtils.scheduleCycle(ns, target, previousCycle);
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
    const batchJob = new BatchJob(ns, {
        target,
        jobs
    });
    await JobAPI.communicateBatchJob(ns, batchJob);
}
async function optimizePerformance(ns, target) {
    let performanceUpdated = false;
    let adjustment = 0.00;
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
export async function onDestroy(ns) {
    clearInterval(hackLoopInterval);
    // TODO: Wait until it is done executing
    Utils.tprintColored("Stopping the daemon", true, CONSTANT.COLOR_INFORMATION);
}
export async function main(ns) {
    const hostName = ns.getHostname();
    if (hostName !== "home") {
        throw new Error("Execute daemon script from home.");
    }
    Utils.tprintColored("Starting the daemon", true, CONSTANT.COLOR_INFORMATION);
    // TODO: Make a decision on whether we start the to-be-made early hacking scripts, 
    // or whether we want to start hacking using our main hacker
    await initialize(ns);
    hackLoopInterval = setInterval(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY);
    while (true) {
        const shouldKill = await ControlFlowAPI.hasDaemonKillRequest(ns);
        if (shouldKill) {
            await onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
