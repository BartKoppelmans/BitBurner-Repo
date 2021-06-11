import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
import * as ServerAPI from "/src/api/ServerAPI.js";

export async function computeMaxCycles(ns: NS, cycleCost: number, allowSpread: boolean = true): Promise<number> {

    const serverMap: Server[] = await ServerAPI.getHackingServers(ns);

    // NOTE: We always expect AT LEAST 1 rooted server to be available
    if (!allowSpread) {
        const server: Server = serverMap.shift() as Server;
        return Math.floor(server.getAvailableRam(ns) / cycleCost);
    }

    // TODO: Revert back
    // return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0);

    // TODO: Create an early game mode or smth
    return Math.floor(serverMap.reduce((threads, server) => threads + server.getAvailableRam(ns), 0) / cycleCost);
}

export async function scheduleCycle(ns: NS, target: HackableServer, batchStart: Date): Promise<Job[]> {
    const scheduledJob1: Job = await createCycleJob(ns, target, Tools.HACK, batchStart);

    let scheduledJobStart2: Date = new Date(scheduledJob1.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob2: Job = await createCycleJob(ns, target, Tools.WEAKEN, scheduledJobStart2, true);

    let scheduledJobStart3: Date = new Date(scheduledJob2.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob3: Job = await createCycleJob(ns, target, Tools.GROW, scheduledJobStart3);

    let scheduledJobStart4: Date = new Date(scheduledJob3.end.getTime() + CONSTANT.CYCLE_DELAY);
    const scheduledJob4: Job = await createCycleJob(ns, target, Tools.WEAKEN, scheduledJobStart4, false);

    return [scheduledJob1, scheduledJob2, scheduledJob3, scheduledJob4];
}


export async function createCycleJob(ns: NS, target: HackableServer, tool: Tools, start: Date, isFirstWeaken: boolean = false): Promise<Job> {
    let threads: number;
    let executionTime: number;

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

    const end: Date = new Date(start.getTime() + executionTime);

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
export function getOptimalBatchCost(ns: NS, target: HackableServer): number {
    const weakenCost: number = ServerHackUtils.weakenThreadTotalPerCycle(ns, target) * ToolUtils.getToolCost(ns, Tools.WEAKEN);
    const growCost: number = ServerHackUtils.growThreadsNeededAfterTheft(ns, target) * ToolUtils.getToolCost(ns, Tools.GROW);
    const hackCost: number = ServerHackUtils.hackThreadsNeeded(ns, target) * ToolUtils.getToolCost(ns, Tools.HACK);

    return weakenCost + growCost + hackCost;
}
