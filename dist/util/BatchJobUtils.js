import * as ServerAPI from "/src/api/ServerAPI.js";
import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
export async function computeMaxCycles(ns, cycleCost, allowSpread = true) {
    const serverMap = await ServerAPI.getHackingServers(ns);
    // NOTE: We always expect AT LEAST 1 rooted server to be available
    if (!allowSpread) {
        const server = serverMap.shift();
        return Math.floor(server.getAvailableRam(ns) / cycleCost);
    }
    // TODO: Revert back
    // return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0);
    // TODO: Create an early game mode or smth
    return Math.floor(serverMap.reduce((threads, server) => threads + server.getAvailableRam(ns), 0) / cycleCost);
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
    const weakenCost = ServerHackUtils.weakenThreadTotalPerCycle(ns, target) * ToolUtils.getToolCost(ns, Tools.WEAKEN);
    const growCost = ServerHackUtils.growThreadsNeededAfterTheft(ns, target) * ToolUtils.getToolCost(ns, Tools.GROW);
    const hackCost = ServerHackUtils.hackThreadsNeeded(ns, target) * ToolUtils.getToolCost(ns, Tools.HACK);
    return weakenCost + growCost + hackCost;
}
