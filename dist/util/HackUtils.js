import BatchJob from "/src/classes/BatchJob.js";
import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
import { JobManager } from "/src/managers/JobManager.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import BatchJobUtils from "/src/util/BatchJobUtils.js";
import JobUtils from "/src/util/JobUtils.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
import ToolUtils from "/src/util/ToolUtils.js";
export default class HackUtils {
    // Return true when we have found a new target
    static async hack(ns, server) {
        const jobManager = JobManager.getInstance();
        // TODO: Make sure that all neccesary variables are set (remove the exclamation marks)
        // If it is prepping, leave it
        if (jobManager.isPrepping(ns, server))
            return false;
        // From here on it is a target
        // It is a target, but is currently resting
        if (jobManager.isTargetting(ns, server))
            return true;
        // Prep the server
        await this.prepServer(ns, server);
        // The server is not optimal, other targets take up the RAM
        if (server.dynamicHackingProperties.securityLevel > server.staticHackingProperties.minSecurityLevel || server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney)
            return true;
        // If it is prepping, leave it
        if (jobManager.isPrepping(ns, server))
            return true;
        // TODO: Optimize performance metrics
        await this.attackServer(ns, server);
        return true;
    }
    static async prepServer(ns, target) {
        const jobManager = JobManager.getInstance();
        // We should not prep anymore once we are targetting
        if (jobManager.isTargetting(ns, target))
            return;
        // If the server is optimal, we are done I guess
        if (target.dynamicHackingProperties.securityLevel === target.staticHackingProperties.minSecurityLevel && target.dynamicHackingProperties.money === target.staticHackingProperties.maxMoney)
            return;
        const playerManager = PlayerManager.getInstance(ns);
        let growThreads = 0;
        let weakenThreads = 0;
        let compensationWeakenThreads = 0;
        // First grow, so that the amount of money is optimal
        if (target.dynamicHackingProperties.money < target.staticHackingProperties.maxMoney) {
            let maxGrowThreads = await JobUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
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
                await new Job(ns, {
                    target,
                    threads: growThreads,
                    tool: Tools.GROW,
                    isPrep: true,
                }).execute(ns);
            }
        }
        let weakenThreadsNeeded = (await JobUtils.computeThreadsNeeded(ns, Tools.WEAKEN, target)) + compensationWeakenThreads;
        let maxWeakenThreads = await JobUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
        weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);
        if (weakenThreads > 0) {
            await new Job(ns, {
                target,
                threads: weakenThreads,
                tool: Tools.WEAKEN,
                isPrep: true,
            }).execute(ns);
        }
    }
    static async attackServer(ns, target) {
        // TODO: Refactor this
        let jobs = [];
        let batchStart = new Date();
        const optimalBatchCost = BatchJobUtils.getOptimalBatchCost(ns, target);
        const optimalCycles = ServerHackUtils.computeOptimalCycles(ns, target);
        const maxCycles = await BatchJobUtils.computeMaxCycles(ns, optimalBatchCost, true);
        let numCycles = Math.min(optimalCycles, maxCycles);
        if (numCycles === 0) {
            // NOTE: HOW THE FUCK DOES THIS HAPPEN
            // Don't throw the error, that would be logical
            // throw new Error("No cycles possible.");
            numCycles = 1;
        }
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
        await new BatchJob(ns, {
            target,
            jobs,
            start: batchStart
        }).execute(ns);
    }
}
