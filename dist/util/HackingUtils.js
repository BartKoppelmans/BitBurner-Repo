import * as ServerAPI from '/src/api/ServerAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import { Tools } from '/src/tools/Tools.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import Job from '/src/classes/Job/Job.js';
import * as Utils from '/src/util/Utils.js';
import Batch from '/src/classes/Job/Batch.js';
import * as JobAPI from '/src/api/JobAPI.js';
import * as HackingCalculationUtils from '/src/util/HackingCalculationUtils.js';
import * as LogAPI from '/src/api/LogAPI.js';
// const MAX_CYCLE_NUMBER: number = 50 as const // TODO: Find a way to determine this dynamically
export async function hack(ns, jobStorage, target) {
    // If it is prepping or targeting, leave it
    if (target.status !== ServerStatus.NONE)
        return;
    // The server is not optimal, so we have to prep it first
    if (!target.isOptimal(ns)) {
        await prepServer(ns, jobStorage, target);
        return;
    }
    // Make sure that the percentage that we steal is optimal
    await optimizePerformance(ns, target);
    await attackServer(ns, jobStorage, target);
    return;
}
async function createJob(ns, target, tool, prepEffects, batchId, start, end) {
    const threadSpread = new Map();
    for (const prepEffect of prepEffects) {
        threadSpread.set(prepEffect.source.characteristics.host, prepEffect.threads);
        await ServerAPI.increaseReservation(ns, prepEffect.source.characteristics.host, prepEffect.threads * ToolUtils.getToolCost(ns, tool));
    }
    const threads = prepEffects.reduce((total, prepEffect) => total + prepEffect.threads, 0);
    return new Job(ns, {
        id: Utils.generateHash(),
        batchId,
        start,
        end,
        target,
        threads,
        threadSpread,
        tool,
        isPrep: true,
    });
}
function calculateTimings(growthTime, weakenTime, firstStartTime) {
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
    return {
        growthStart: growthStartTime,
        growthEnd: growthEndTime,
        weakenStart: compensationWeakenStartTime,
        weakenEnd: compensationWeakenEndTime,
    };
}
export async function prepServer(ns, jobStorage, target) {
    // If the server is optimal, we are done I guess
    if (target.isOptimal(ns))
        return;
    let initialWeakenJob;
    let growJob;
    let compensationWeakenJob;
    const batchId = Utils.generateHash();
    let startTime;
    let endTime;
    const jobs = [];
    if (target.needsWeaken(ns)) {
        let weakenAmount = target.getSecurityLevel(ns) - target.staticHackingProperties.minSecurityLevel;
        const weakenPrepEffects = [];
        for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
            const potentialPrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.WEAKEN, target, preppingServer, target.staticHackingProperties.minSecurityLevel + weakenAmount);
            // TODO: This might be a problem if we do need to weaken, but for some reason we cannot put in a  full
            // thread?
            if (potentialPrepEffect.threads === 0)
                continue;
            weakenAmount -= potentialPrepEffect.amount;
            weakenPrepEffects.push(potentialPrepEffect);
            if (weakenAmount <= 0)
                break;
        }
        if (weakenPrepEffects.length > 0) {
            const weakenTime = target.getWeakenTime(ns);
            const weakenStart = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
            const weakenEnd = new Date(weakenStart.getTime() + weakenTime);
            initialWeakenJob = await createJob(ns, target, Tools.WEAKEN, weakenPrepEffects, batchId, weakenStart, weakenEnd);
            startTime = weakenStart;
            endTime = weakenEnd;
            jobs.push(initialWeakenJob);
        }
    }
    // First grow, so that the amount of money is optimal
    if (target.needsGrow(ns)) {
        const weakenTime = target.getWeakenTime(ns);
        const growthTime = target.getGrowTime(ns);
        const firstStartTime = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
        startTime = firstStartTime;
        const timings = calculateTimings(growthTime, weakenTime, firstStartTime);
        let growAmount = target.staticHackingProperties.maxMoney - target.getMoney(ns);
        const growPrepEffects = [];
        for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
            const potentialPrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.GROW, target, preppingServer, target.staticHackingProperties.maxMoney - growAmount);
            if (potentialPrepEffect.threads === 0)
                continue;
            growAmount -= potentialPrepEffect.amount;
            growPrepEffects.push(potentialPrepEffect);
            if (growAmount <= 0)
                break;
        }
        if (growPrepEffects.length > 0) {
            endTime = timings.growthEnd;
            growJob = await createJob(ns, target, Tools.GROW, growPrepEffects, batchId, timings.growthStart, timings.growthEnd);
            jobs.push(growJob);
        }
        // We might still have room for the compensation weaken
        if (growAmount === 0) {
            const growThreads = growPrepEffects.reduce((total, prepEffect) => total + prepEffect.threads, 0);
            let weakenAmount = growThreads * CONSTANT.GROW_HARDENING;
            const weakenPrepEffects = [];
            for (const preppingServer of ServerAPI.getPreppingServers(ns)) {
                const potentialPrepEffect = HackingCalculationUtils.calculatePotentialPrepEffect(ns, Tools.WEAKEN, target, preppingServer, target.staticHackingProperties.minSecurityLevel + weakenAmount);
                if (potentialPrepEffect.threads === 0)
                    continue;
                weakenAmount -= potentialPrepEffect.amount;
                weakenPrepEffects.push(potentialPrepEffect);
                if (weakenAmount <= 0)
                    break;
            }
            if (weakenPrepEffects.length > 0) {
                endTime = timings.weakenEnd;
                compensationWeakenJob = await createJob(ns, target, Tools.WEAKEN, weakenPrepEffects, batchId, timings.weakenStart, timings.weakenEnd);
                jobs.push(compensationWeakenJob);
            }
        }
    }
    if (jobs.length === 0)
        return; // All this work for nothing...
    // NOTE: Unfortunately we need this for type safety
    if (!startTime || !endTime)
        throw new Error('How the fuck do we not have timings available?');
    const batchJob = new Batch(ns, {
        batchId,
        target,
        jobs,
        start: startTime,
        end: endTime,
    });
    await JobAPI.startBatch(ns, jobStorage, batchJob);
}
export async function attackServer(ns, jobStorage, target) {
    const cycleSpreads = HackingCalculationUtils.computeCycleSpread(ns, target);
    const numCycles = cycleSpreads.reduce((total, cycleSpread) => total + cycleSpread.numCycles, 0);
    if (numCycles === 0) {
        LogAPI.printLog(ns, 'Skipped an attack.');
        return;
    }
    const batchId = Utils.generateHash();
    const cycles = [];
    for (const cycleSpread of cycleSpreads) {
        for (let i = 0; i < cycleSpread.numCycles; i++) {
            const cycle = await HackingCalculationUtils.scheduleCycle(ns, target, cycleSpread.source, batchId, cycles[cycles.length - 1]);
            cycles.push(cycle);
        }
    }
    if (cycles.length === 0) {
        throw new Error('No cycles created');
    }
    const startTime = cycles[0].weaken1.start;
    const endTime = cycles[cycles.length - 1].weaken2.end;
    const jobs = cycles.reduce((array, cycle) => [...array, cycle.hack, cycle.weaken1, cycle.growth, cycle.weaken2], []);
    // Create the batch object
    const batchJob = new Batch(ns, {
        batchId,
        target,
        jobs,
        start: startTime,
        end: endTime,
    });
    await JobAPI.startBatch(ns, jobStorage, batchJob);
}
export async function optimizePerformance(ns, target) {
    // PERFORMANCE: This is a very expensive function call
    // TODO: This does not seem to work properly?
    let performanceUpdated = false;
    const hackingServers = ServerAPI.getHackingServers(ns);
    const originalPercentageToSteal = target.percentageToSteal;
    let optimalTarget = {
        percentageToSteal: CONSTANT.MIN_PERCENTAGE_TO_STEAL,
        profitsPerSecond: -1,
    };
    for (let n = CONSTANT.MIN_PERCENTAGE_TO_STEAL; n <= CONSTANT.MAX_PERCENTAGE_TO_STEAL; n += CONSTANT.DELTA_PERCENTAGE_TO_STEAL) {
        target.percentageToSteal = n;
        const cycleSpreads = HackingCalculationUtils.computeCycleSpread(ns, target, hackingServers);
        const numCycles = cycleSpreads.reduce((total, cycleSpread) => total + cycleSpread.numCycles, 0);
        const profit = target.staticHackingProperties.maxMoney * target.percentageToSteal * numCycles;
        const totalTime = HackingCalculationUtils.calculateTotalBatchTime(ns, target, numCycles);
        const profitsPerSecond = profit / totalTime;
        if (profitsPerSecond > optimalTarget.profitsPerSecond) {
            optimalTarget = { percentageToSteal: n, profitsPerSecond };
        }
    }
    target.percentageToSteal = optimalTarget.percentageToSteal;
    if (originalPercentageToSteal !== optimalTarget.percentageToSteal)
        performanceUpdated = true;
    if (performanceUpdated) {
        LogAPI.printLog(ns, `Updated percentage to steal for ${target.characteristics.host} to ~${Math.round(target.percentageToSteal * 100)}%`);
    }
}
