import BatchJob from "/src/classes/BatchJob.js";
import Job from "/src/classes/Job.js";
import { ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import * as BatchJobUtils from "/src/util/BatchJobUtils.js";
import * as JobUtils from "/src/util/JobUtils.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
import * as Utils from "/src/util/Utils.js";
// Return true when we have found a new target
export async function hack(ns, target) {
    // If it is prepping or targetting, leave it
    if (target.status !== ServerStatus.NONE)
        return;
    // The server is not optimal, so we have to prep it first
    if (!target.isOptimal()) {
        await prepServer(ns, target);
        return;
    }
    // Make sure that the percentage that we steal is optimal
    await optimizePerformance(ns, target);
    await attackServer(ns, target);
    return;
}
export async function prepServer(ns, target) {
    // If the server is optimal, we are done I guess
    if (target.isOptimal())
        return;
    const playerManager = PlayerManager.getInstance(ns);
    let growThreads = 0;
    let weakenThreads = 0;
    let compensationWeakenThreads = 0;
    // First grow, so that the amount of money is optimal
    if (target.dynamicHackingProperties.money < target.staticHackingProperties.maxMoney) {
        let maxGrowThreads = await JobUtils.computeMaxThreads(ns, Tools.GROW, true);
        let neededGrowThreads = await JobUtils.computeThreadsNeeded(ns, Tools.GROW, target);
        let weakenThreadsNeeded = await JobUtils.computeThreadsNeeded(ns, Tools.WEAKEN, target);
        // The grow threads that are available and needed
        growThreads = Math.min(maxGrowThreads, neededGrowThreads);
        // The number of weaken threads needed to compensate for growth
        compensationWeakenThreads = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
        let growThreadThreshold = (maxGrowThreads - neededGrowThreads) * (ToolUtils.getToolCost(ns, Tools.GROW) / ToolUtils.getToolCost(ns, Tools.WEAKEN));
        let releasedGrowThreads = (ToolUtils.getToolCost(ns, Tools.WEAKEN) / ToolUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);
        if (growThreadThreshold >= releasedGrowThreads) {
            releasedGrowThreads = 0;
        }
        growThreads -= releasedGrowThreads;
        if (growThreads > 0) {
            await (new Job(ns, {
                target,
                threads: growThreads,
                tool: Tools.GROW,
                isPrep: true,
            })).execute(ns);
        }
    }
    let weakenThreadsNeeded = (await JobUtils.computeThreadsNeeded(ns, Tools.WEAKEN, target)) + compensationWeakenThreads;
    let maxWeakenThreads = await JobUtils.computeMaxThreads(ns, Tools.WEAKEN, true);
    weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);
    if (weakenThreads > 0) {
        await (new Job(ns, {
            target,
            threads: weakenThreads,
            tool: Tools.WEAKEN,
            isPrep: true,
        })).execute(ns);
    }
}
export async function attackServer(ns, target) {
    // TODO: Refactor this
    let jobs = [];
    let batchStart = new Date();
    const optimalBatchCost = BatchJobUtils.getOptimalBatchCost(ns, target);
    const optimalCycles = ServerHackUtils.computeOptimalCycles(ns, target);
    const maxCycles = await BatchJobUtils.computeMaxCycles(ns, optimalBatchCost, true);
    // TODO: Somehow here we have more than 0 cycles
    let numCycles = Math.min(optimalCycles, maxCycles);
    // NOTE: This could cause us to never attack
    if (numCycles === 0) {
        // TODO: Here we should schedule an attack for in the future.
        if (CONSTANT.DEBUG_HACKING)
            Utils.tprintColored("Skipped an attack.", true, CONSTANT.COLOR_WARNING);
        return;
    }
    // TODO: But we don't have any cycles here?
    for (let i = 0; i < numCycles; i++) {
        let cycleStart;
        // Set the start time of the cycle
        if (jobs.length > 0) {
            const lastJob = jobs[jobs.length - 1];
            cycleStart = new Date(lastJob.end.getTime() + CONSTANT.CYCLE_DELAY);
        }
        else {
            cycleStart = new Date(batchStart);
        }
        let cycle = await BatchJobUtils.scheduleCycle(ns, target, cycleStart);
        jobs.push(...cycle);
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
    if (jobs.length === 0) {
        throw new Error("No cycles created");
    }
    // Create the batch object
    await (new BatchJob(ns, {
        target,
        jobs,
        start: batchStart
    })).execute(ns);
}
async function optimizePerformance(ns, target) {
    let performanceUpdated = false;
    let adjustment = 0.00;
    do {
        adjustment = await analyzePerformance(ns, target);
        if (adjustment !== 0.00) {
            performanceUpdated = true;
            target.dynamicHackingProperties.percentageToSteal += adjustment;
        }
        await ns.sleep(CONSTANT.SMALL_DELAY);
    } while (adjustment !== 0.00);
    if (performanceUpdated && CONSTANT.DEBUG_HACKING) {
        const updatedPercentage = (Math.floor(ServerHackUtils.actualPercentageToSteal(ns, target) * 100 * 100) / 100);
        Utils.tprintColored(`Updated percentage to steal for ${target.characteristics.host} to ${updatedPercentage}`, true, CONSTANT.COLOR_HACKING);
    }
}
async function analyzePerformance(ns, target) {
    const optimalBatchCost = BatchJobUtils.getOptimalBatchCost(ns, target);
    const optimalCycles = ServerHackUtils.computeOptimalCycles(ns, target);
    const maxCycles = await BatchJobUtils.computeMaxCycles(ns, optimalBatchCost, true);
    const isMin = target.dynamicHackingProperties.percentageToSteal <= CONSTANT.MIN_PERCENTAGE_TO_STEAL;
    const isMax = target.dynamicHackingProperties.percentageToSteal >= CONSTANT.MAX_PERCENTAGE_TO_STEAL;
    if (maxCycles < optimalCycles && !isMin)
        return -0.01;
    else if (maxCycles < optimalCycles && isMin)
        return 0.00;
    else if (maxCycles > optimalCycles && isMax)
        return 0.00;
    else if (maxCycles > optimalCycles && !isMax) {
        // Make a comparison
        target.dynamicHackingProperties.percentageToSteal += 0.01;
        const shouldBeIncreased = await shouldIncrease(ns, target);
        target.dynamicHackingProperties.percentageToSteal -= 0.01;
        return ((shouldBeIncreased) ? 0.01 : 0.00);
    }
    return 0.00;
}
async function shouldIncrease(ns, target) {
    const optimalBatchCost = BatchJobUtils.getOptimalBatchCost(ns, target);
    const optimalCycles = ServerHackUtils.computeOptimalCycles(ns, target);
    const maxCycles = await BatchJobUtils.computeMaxCycles(ns, optimalBatchCost, true);
    return maxCycles >= optimalCycles;
}
