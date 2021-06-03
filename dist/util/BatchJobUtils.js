import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
import ServerManager from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";
import * as JobUtils from "/src/util/JobUtils.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
export async function computeMaxCycles(ns, cycleCost, allowSpread = true) {
    const serverManager = ServerManager.getInstance(ns);
    const serverMap = await serverManager.getHackingServers(ns);
    // NOTE: We always expect AT LEAST 1 rooted server to be available
    if (!allowSpread) {
        const server = serverMap.shift();
        return Math.floor(server.getAvailableRam(ns) / cycleCost);
    }
    return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0);
}
export async function scheduleCycle(ns, target, batchStart) {
    const scheduledJob1 = await createCycleJob(ns, target, Tools.HACK, batchStart);
    let scheduledJobStart2 = new Date(scheduledJob1.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob2 = await createCycleJob(ns, target, Tools.WEAKEN, scheduledJobStart2, true);
    let scheduledJobStart3 = new Date(scheduledJob2.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob3 = await createCycleJob(ns, target, Tools.GROW, scheduledJobStart3);
    let scheduledJobStart4 = new Date(scheduledJob3.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob4 = await createCycleJob(ns, target, Tools.WEAKEN, scheduledJobStart4, false);
    return [scheduledJob1, scheduledJob2, scheduledJob3, scheduledJob4];
}
export async function createCycleJob(ns, target, tool, start, isFirstWeaken = false) {
    let threads;
    let executionTime;
    const maxThreadsAvailable = await JobUtils.computeMaxThreads(ns, tool, true);
    if (tool === Tools.HACK) {
        executionTime = ns.getHackTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
        threads = ServerHackUtils.hackThreadsNeeded(ns, target);
    }
    else if (tool === Tools.WEAKEN) {
        executionTime = ns.getWeakenTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
        threads = (isFirstWeaken) ? ServerHackUtils.weakenThreadsNeededAfterTheft(ns, target) : ServerHackUtils.weakenThreadsNeededAfterGrowth(ns, target);
    }
    else if (tool === Tools.GROW) {
        executionTime = ns.getGrowTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
        threads = ServerHackUtils.growThreadsNeededAfterTheft(ns, target);
    }
    else {
        throw new Error("Tool not recognized");
    }
    const end = new Date(start.getTime() + executionTime);
    return new Job(ns, {
        target,
        tool,
        threads,
        start,
        end,
        isPrep: false
    });
}
// Returns the number of threads
export function getOptimalBatchCost(ns, target) {
    // TODO: Refactor this shitshow
    const weakenCost = ServerHackUtils.weakenThreadTotalPerCycle(ns, target);
    const growCost = ServerHackUtils.growThreadsNeededAfterTheft(ns, target);
    const hackCost = ServerHackUtils.hackThreadsNeeded(ns, target);
    return weakenCost + growCost + hackCost;
}
