import type { BitBurner as NS } from "Bitburner";
import BatchJob from "/src/classes/BatchJob.js";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
import JobManager from "/src/managers/JobManager.js";
import PlayerManager from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import * as BatchJobUtils from "/src/util/BatchJobUtils.js";
import * as JobUtils from "/src/util/JobUtils.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
import * as Utils from "/src/util/Utils.js";

// Return true when we have found a new target
export async function hack(ns: NS, server: HackableServer): Promise<void> {

    const jobManager: JobManager = JobManager.getInstance();

    // If it is prepping, leave it
    if (jobManager.isPrepping(ns, server)) return;

    // From here on it is a target

    // It is a target, but is currently resting
    if (jobManager.isTargetting(ns, server)) return;

    // Prep the server
    await prepServer(ns, server);

    // The server is not optimal, other targets take up the RAM
    if (server.dynamicHackingProperties.securityLevel > server.staticHackingProperties.minSecurityLevel || server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney) return;

    // If it is prepping, leave it
    if (jobManager.isPrepping(ns, server)) return;

    // TODO: Optimize performance metrics

    await attackServer(ns, server);

    return;
}

export async function prepServer(ns: NS, target: HackableServer): Promise<void> {

    const jobManager: JobManager = JobManager.getInstance();

    // We should not prep anymore once we are targetting
    if (jobManager.isTargetting(ns, target)) return;

    // If the server is optimal, we are done I guess
    if (target.dynamicHackingProperties.securityLevel === target.staticHackingProperties.minSecurityLevel && target.dynamicHackingProperties.money === target.staticHackingProperties.maxMoney) return;

    const playerManager: PlayerManager = PlayerManager.getInstance(ns);

    let growThreads: number = 0;
    let weakenThreads: number = 0;
    let compensationWeakenThreads: number = 0;

    // First grow, so that the amount of money is optimal
    if (target.dynamicHackingProperties.money < target.staticHackingProperties.maxMoney) {
        let maxGrowThreads: number = await JobUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
        let neededGrowThreads: number = await JobUtils.computeThreadsNeeded(ns, Tools.GROW, target);
        let weakenThreadsNeeded: number = await JobUtils.computeThreadsNeeded(ns, Tools.WEAKEN, target);

        // The grow threads that are available and needed
        growThreads = Math.min(maxGrowThreads, neededGrowThreads);

        // The number of weaken threads needed to compensate for growth
        compensationWeakenThreads = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());

        let growThreadThreshold: number = (maxGrowThreads - neededGrowThreads) * (ToolUtils.getToolCost(ns, Tools.GROW) / ToolUtils.getToolCost(ns, Tools.WEAKEN));

        let releasedGrowThreads: number = (ToolUtils.getToolCost(ns, Tools.WEAKEN) / ToolUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);

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

    let weakenThreadsNeeded: number = (await JobUtils.computeThreadsNeeded(ns, Tools.WEAKEN, target)) + compensationWeakenThreads;
    let maxWeakenThreads: number = await JobUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
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

export async function attackServer(ns: NS, target: HackableServer): Promise<void> {

    // TODO: Refactor this

    let jobs: Job[] = [];

    let batchStart: Date = new Date();

    const optimalBatchCost: number = BatchJobUtils.getOptimalBatchCost(ns, target);
    const optimalCycles: number = ServerHackUtils.computeOptimalCycles(ns, target);
    const maxCycles: number = await BatchJobUtils.computeMaxCycles(ns, optimalBatchCost, true);

    let numCycles: number = Math.min(optimalCycles, maxCycles);

    // NOTE: This could cause us to never attack
    if (numCycles === 0) {

        // TODO: Here we should schedule an attack for in the future.

        Utils.tprintColored("Skipped an attack.", true, CONSTANT.COLOR_WARNING);
        return;
    }

    for (let i = 0; i < numCycles; i++) {

        let cycleStart: Date;

        // Set the start time of the cycle
        if (jobs.length > 0) {
            const lastJob: Job = jobs[jobs.length - 1];
            cycleStart = new Date(lastJob.end.getTime() + CONSTANT.CYCLE_DELAY);
        } else {
            cycleStart = new Date(batchStart);
        }

        let cycle: Job[] = await BatchJobUtils.scheduleCycle(ns, target, cycleStart);
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