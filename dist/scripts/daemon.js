import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as JobAPI from '/src/api/JobAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as ProgramAPI from '/src/api/ProgramAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import BatchJob from '/src/classes/BatchJob.js';
import Job from '/src/classes/Job.js';
import { LogMessageCode } from '/src/interfaces/PortMessageInterfaces.js';
import { ServerStatus } from '/src/interfaces/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import { Tools } from '/src/tools/Tools.js';
import * as CycleUtils from '/src/util/CycleUtils.js';
import * as HackUtils from '/src/util/HackUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import { Heuristics } from '/src/util/Heuristics.js';
import * as Utils from '/src/util/Utils.js';
let isHacking = false;
let hackLoopTimeout;
let runnerInterval;
async function initialize(ns) {
    Utils.disableLogging(ns);
    await ServerAPI.initializeServerMap(ns);
    await JobAPI.initializeJobMap(ns);
    await JobAPI.startJobManager(ns);
    await LogAPI.startLogManager(ns);
    await ProgramAPI.startProgramManager(ns);
}
async function hackLoop(ns) {
    await ControlFlowAPI.launchRunners(ns);
    // Get the potential targets
    let potentialTargets = await ServerAPI.getTargetServers(ns);
    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        return target.evaluate(ns, Heuristics.DiscordHeuristic);
    }));
    // We would have a problem if there are no targets
    if (potentialTargets.length === 0) {
        throw new Error('No potential targets found.');
    }
    // Sort the potential targets
    potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
    // Attack each of the targets
    for await (const target of potentialTargets) {
        while (isHacking) {
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }
        isHacking = true;
        const currentTargets = await ServerAPI.getCurrentTargets(ns);
        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
            isHacking = false;
            break;
        }
        await hack(ns, target);
        isHacking = false;
    }
    hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY);
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
    let initialWeakenJob;
    let growJob;
    let compensationWeakenJob;
    const batchId = Utils.generateHash();
    const jobs = [];
    let availableThreads = await HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true);
    if (availableThreads === 0) {
        if (CONSTANT.DEBUG_HACKING)
            await LogAPI.log(ns, 'Skipped a prep.', true, LogMessageCode.WARNING);
        return;
    }
    // TODO: Ideally we pick the server that can fit all our threads here immediately,
    // then we can have everything on one source server
    // TODO: Refactor this shitshow
    if (target.needsWeaken(ns)) {
        const neededWeakenThreads = HackUtils.calculateWeakenThreads(ns, target);
        const weakenThreads = Math.min(neededWeakenThreads, availableThreads);
        const weakenThreadSpread = await HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true);
        const weakenTime = target.getWeakenTime(ns);
        const weakenStart = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
        const weakenEnd = new Date(weakenStart.getTime() + weakenTime);
        initialWeakenJob = new Job(ns, {
            id: Utils.generateHash(),
            batchId,
            start: weakenStart,
            end: weakenEnd,
            target,
            threads: weakenThreads,
            threadSpread: weakenThreadSpread,
            tool: Tools.WEAKEN,
            isPrep: true,
        });
        jobs.push(initialWeakenJob);
        for await (const [server, threads] of weakenThreadSpread) {
            await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN));
        }
    }
    // First grow, so that the amount of money is optimal
    if (target.needsGrow(ns) && availableThreads > 0) {
        const neededGrowthThreads = HackUtils.calculateGrowthThreads(ns, target);
        const compensationWeakenThreads = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, neededGrowthThreads);
        const totalThreads = neededGrowthThreads + compensationWeakenThreads;
        const threadsFit = (totalThreads < availableThreads);
        // NOTE: Here we do Math.floor, which could cause us not to execute enough weakens/grows
        // However, we currently run into a lot of errors regarding too little threads available, which is why we do
        // this.
        const growthThreads = (threadsFit) ? neededGrowthThreads : Math.floor(neededGrowthThreads * (availableThreads / totalThreads));
        const weakenThreads = (threadsFit) ? compensationWeakenThreads : Math.floor(compensationWeakenThreads * (availableThreads / totalThreads));
        availableThreads -= growthThreads + weakenThreads;
        if (growthThreads > 0 && weakenThreads > 0) {
            const weakenTime = target.getWeakenTime(ns);
            const growthTime = target.getGrowTime(ns);
            const firstStartTime = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
            let growthStartTime;
            let growthEndTime;
            let compensationWeakenEndTime;
            let compensationWeakenStartTime;
            if ((growthTime + CONSTANT.JOB_DELAY) > weakenTime) {
                growthStartTime = new Date(firstStartTime.getTime());
                growthEndTime = new Date(growthStartTime.getTime() + growthTime);
                compensationWeakenEndTime = new Date(growthEndTime.getTime() + CONSTANT.JOB_DELAY);
                compensationWeakenStartTime = new Date(compensationWeakenEndTime.getTime() - weakenTime);
            }
            else {
                compensationWeakenStartTime = new Date(firstStartTime.getTime());
                compensationWeakenEndTime = new Date(compensationWeakenStartTime.getTime() + growthTime);
                growthEndTime = new Date(compensationWeakenEndTime.getTime() - CONSTANT.JOB_DELAY);
                growthStartTime = new Date(growthEndTime.getTime() - growthTime);
            }
            const growthThreadSpread = await HackUtils.computeThreadSpread(ns, Tools.GROW, growthThreads, true);
            growJob = new Job(ns, {
                id: Utils.generateHash(),
                batchId,
                target,
                threads: growthThreads,
                threadSpread: growthThreadSpread,
                tool: Tools.GROW,
                isPrep: true,
                start: growthStartTime,
                end: growthEndTime,
            });
            jobs.push(growJob);
            for (const [server, threads] of growthThreadSpread) {
                await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.GROW));
            }
            const compensationWeakenThreadSpread = await HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true);
            compensationWeakenJob = new Job(ns, {
                id: Utils.generateHash(),
                batchId,
                target,
                threads: weakenThreads,
                threadSpread: compensationWeakenThreadSpread,
                tool: Tools.WEAKEN,
                isPrep: true,
                start: compensationWeakenStartTime,
                end: compensationWeakenEndTime,
            });
            jobs.push(compensationWeakenJob);
            for (const [server, threads] of compensationWeakenThreadSpread) {
                await ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN));
            }
        }
    }
    // We could not create any jobs, probably the RAM was already fully used.
    // TODO: Filter this at the start, if we cannot start any threads, we should not even go here
    if (jobs.length === 0)
        return;
    const batchJob = new BatchJob(ns, {
        batchId,
        target,
        jobs,
    });
    await JobAPI.startBatchJob(ns, batchJob);
}
async function attackServer(ns, target) {
    const numPossibleCycles = await CycleUtils.computeCycles(ns, target);
    const numCycles = Math.min(numPossibleCycles, CONSTANT.MAX_CYCLE_NUMBER);
    const batchId = Utils.generateHash();
    if (numCycles === 0) {
        if (CONSTANT.DEBUG_HACKING)
            await LogAPI.log(ns, 'Skipped an attack.', true, LogMessageCode.WARNING);
        return;
    }
    const cycles = [];
    for (let i = 0; i < numCycles; i++) {
        const cycle = await CycleUtils.scheduleCycle(ns, target, batchId, cycles[cycles.length - 1]);
        cycles.push(cycle);
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
    if (cycles.length === 0) {
        throw new Error('No cycles created');
    }
    const jobs = cycles.reduce((array, cycle) => [...array, cycle.hack, cycle.weaken1, cycle.growth, cycle.weaken2], []);
    // Create the batch object
    const batchJob = new BatchJob(ns, {
        batchId: Utils.generateHash(),
        target,
        jobs,
    });
    await JobAPI.startBatchJob(ns, batchJob);
}
async function optimizePerformance(ns, target) {
    let performanceUpdated = false;
    const originalPercentageToSteal = target.percentageToSteal;
    let optimalTarget = {
        percentageToSteal: CONSTANT.MIN_PERCENTAGE_TO_STEAL,
        profitsPerSecond: -1,
    };
    for (let n = CONSTANT.MIN_PERCENTAGE_TO_STEAL; n <= CONSTANT.MAX_PERCENTAGE_TO_STEAL; n += CONSTANT.DELTA_PERCENTAGE_TO_STEAL) {
        target.percentageToSteal = n;
        const cycles = await CycleUtils.computeCycles(ns, target);
        const profit = target.staticHackingProperties.maxMoney * target.percentageToSteal * cycles;
        const totalTime = CycleUtils.calculateTotalBatchTime(ns, target, cycles);
        const profitsPerSecond = profit / totalTime;
        if (profitsPerSecond > optimalTarget.profitsPerSecond) {
            optimalTarget = { percentageToSteal: n, profitsPerSecond };
        }
    }
    target.percentageToSteal = optimalTarget.percentageToSteal;
    if (originalPercentageToSteal !== optimalTarget.percentageToSteal)
        performanceUpdated = true;
    if (performanceUpdated && CONSTANT.DEBUG_HACKING) {
        await LogAPI.log(ns, `Updated percentage to steal for ${target.characteristics.host} to ~${Math.round(target.percentageToSteal * 100)}%`, true, LogMessageCode.HACKING);
    }
}
export async function destroy(ns) {
    clearTimeout(hackLoopTimeout);
    clearTimeout(runnerInterval);
    // TODO: Wait until it is done executing
    await LogAPI.log(ns, 'Stopping the daemon', true, LogMessageCode.INFORMATION);
}
export async function main(ns) {
    const hostName = ns.getHostname();
    if (hostName !== 'home') {
        throw new Error('Execute daemon script from home.');
    }
    // TODO: Make a decision on whether we start the to-be-made early hacking scripts,
    // or whether we want to start hacking using our main hacker
    await initialize(ns);
    await LogAPI.log(ns, 'Starting the daemon', true, LogMessageCode.INFORMATION);
    hackLoopTimeout = setTimeout(hackLoop.bind(null, ns), CONSTANT.HACK_LOOP_DELAY);
    runnerInterval = setInterval(ControlFlowAPI.launchRunners.bind(null, ns), CONSTANT.RUNNER_INTERVAL);
    // TODO: Here we should check whether we are still running the hackloop
    while (true) {
        const shouldKill = await ControlFlowAPI.hasDaemonKillRequest(ns);
        if (shouldKill) {
            await destroy(ns);
            ns.exit();
            return;
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
