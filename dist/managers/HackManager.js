import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import HackUtils from "/src/util/HackUtils.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
import ServerUtils from "/src/util/ServerUtils.js";
import Utils from "/src/util/Utils.js";
export class HackManager {
    constructor() {
        this.hackingMap = [];
        this.hackIdCounter = 0;
    }
    static getInstance() {
        if (!HackManager.instance) {
            HackManager.instance = new HackManager();
        }
        return HackManager.instance;
    }
    // Return true when we have found a new target
    async hack(ns, server) {
        // TODO: Make sure that all neccesary variables are set (remove the exclamation marks)
        // If it is prepping, leave it
        if (this.isPrepping(ns, server))
            return false;
        // From here on it is a target
        // It is a target, but is currently resting
        if (this.isTargetting(ns, server))
            return true;
        // Prep the server
        await this.prepServer(ns, server);
        // The server is not optimal, other targets take up the RAM
        if (server.dynamicHackingProperties.securityLevel > server.staticHackingProperties.minSecurityLevel || server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney)
            return true;
        // If it is prepping, leave it
        if (this.isPrepping(ns, server))
            return true;
        // TODO: Optimize performance metrics
        await this.attackServer(ns, server);
        return true;
    }
    async prepServer(ns, server) {
        // We should not prep anymore once we are targetting
        if (this.isTargetting(ns, server))
            return;
        // If the server is optimal, we are done I guess
        if (server.dynamicHackingProperties.securityLevel === server.staticHackingProperties.minSecurityLevel && server.dynamicHackingProperties.money === server.staticHackingProperties.maxMoney)
            return;
        const playerManager = PlayerManager.getInstance(ns);
        let growThreads = 0;
        let weakenThreads = 0;
        let compensationWeakenThreads = 0;
        // First grow, so that the amount of money is optimal
        if (server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney) {
            let maxGrowThreads = await HackUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
            let neededGrowThreads = await HackUtils.computeThreadsNeeded(ns, Tools.GROW, server);
            let weakenThreadsNeeded = await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server);
            // The grow threads that are available and needed
            growThreads = Math.min(maxGrowThreads, neededGrowThreads);
            // The number of weaken threads needed to compensate for growth
            compensationWeakenThreads = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
            let growThreadThreshold = (maxGrowThreads - neededGrowThreads) * (HackUtils.getToolCost(ns, Tools.GROW) / HackUtils.getToolCost(ns, Tools.WEAKEN));
            let releasedGrowThreads = (HackUtils.getToolCost(ns, Tools.WEAKEN) / HackUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);
            if (growThreadThreshold >= releasedGrowThreads) {
                releasedGrowThreads = 0;
            }
            growThreads -= releasedGrowThreads;
            if (growThreads > 0) {
                await this.executeTool(ns, Tools.GROW, growThreads, server, { isPrep: true });
            }
        }
        let weakenThreadsNeeded = (await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server)) + compensationWeakenThreads;
        let maxWeakenThreads = await HackUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
        weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);
        if (weakenThreads > 0) {
            await this.executeTool(ns, Tools.WEAKEN, weakenThreads, server, { isPrep: true });
        }
    }
    async attackServer(ns, target) {
        let cycles = [];
        let batchStart = new Date();
        batchStart.setTime(batchStart.getTime() + CONSTANT.CYCLE_DELAY);
        // TODO: Measure how many cycles would be optimal and take the minimum with the max_cycle_number
        // For now just always run 10 cycles
        const numCycles = CONSTANT.MAX_CYCLE_NUMBER;
        for (let i = 0; i < numCycles; i++) {
            let cycleStart;
            // Set the start time of the cycle
            if (cycles.length > 0) {
                const lastCycle = cycles[cycles.length - 1];
                cycleStart = new Date(lastCycle.end);
                cycleStart.setTime(lastCycle.end.getTime() + CONSTANT.CYCLE_DELAY);
            }
            else {
                cycleStart = new Date(batchStart);
            }
            let cycle = await this.scheduleCycle(ns, target, i, cycleStart);
            cycles.push(cycle);
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }
        if (cycles.length === 0) {
            throw new Error("No cycles created");
        }
        // Create the batch object
        const batch = {
            target,
            cycles,
            start: batchStart,
            end: cycles[cycles.length - 1].end
        };
        // Execute the batch object
        for (const cycle of cycles) {
            for (const hack of cycle.hacks) {
                // NOTE: Execution here might fail because there are not enough threads available
                // TODO: Wait until there are enough threads available
                await this.executeScheduledHack(ns, hack);
            }
        }
    }
    async scheduleCycle(ns, target, cycleNumber, batchStart) {
        const schedHack1 = await this.createCycleHack(ns, target, Tools.HACK, batchStart);
        let schedHack2Start = new Date(schedHack1.end);
        schedHack2Start.setTime(schedHack2Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack2 = await this.createCycleHack(ns, target, Tools.WEAKEN, schedHack2Start, true);
        let schedHack3Start = new Date(schedHack2.end);
        schedHack3Start.setTime(schedHack3Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack3 = await this.createCycleHack(ns, target, Tools.GROW, schedHack3Start);
        let schedHack4Start = new Date(schedHack3.end);
        schedHack4Start.setTime(schedHack4Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack4 = await this.createCycleHack(ns, target, Tools.WEAKEN, schedHack4Start, false);
        return {
            cycleNumber,
            target,
            hacks: [schedHack1, schedHack2, schedHack3, schedHack4],
            start: batchStart,
            end: new Date(schedHack4.end)
        };
    }
    async createCycleHack(ns, target, tool, start, isFirstWeaken = false) {
        let threads;
        let end = new Date(start);
        if (tool === Tools.HACK) {
            const hackTime = ns.getHackTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
            end.setTime(start.getTime() + hackTime);
            threads = ServerHackUtils.hackThreadsNeeded(ns, target);
        }
        else if (tool === Tools.WEAKEN) {
            const weakenTime = ns.getWeakenTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
            end.setTime(start.getTime() + weakenTime);
            threads = (isFirstWeaken) ? ServerHackUtils.weakenThreadsNeededAfterTheft(ns, target) : ServerHackUtils.weakenThreadsNeededAfterGrowth(ns, target);
        }
        else if (tool === Tools.GROW) {
            const growTime = ns.getGrowTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
            end.setTime(start.getTime() + growTime);
            threads = ServerHackUtils.growThreadsNeededAfterTheft(ns, target);
        }
        else {
            throw new Error("Tool not recognized");
        }
        return {
            target,
            tool,
            threads,
            start,
            end,
            hackId: this.hackIdCounter++
        };
    }
    // Returns the number of threads
    getOptimalBatchCost(ns, target) {
        // TODO: Refactor this shitshow
        const weakenCost = ServerHackUtils.weakenThreadTotalPerCycle(ns, target);
        const growCost = ServerHackUtils.growThreadsNeededAfterTheft(ns, target);
        const hackCost = ServerHackUtils.hackThreadsNeeded(ns, target);
        return weakenCost + growCost + hackCost;
    }
    async executeTool(ns, tool, threads = 1, target, args = {}) {
        const scheduledHack = await this.scheduleHack(ns, tool, threads, target, args);
        const hack = await this.executeScheduledHack(ns, scheduledHack, args);
        return hack;
    }
    async scheduleHack(ns, tool, threads = 1, target, args = {}) {
        const executionTime = HackUtils.getToolTime(ns, tool, target) * CONSTANT.MILLISECONDS_IN_SECOND + CONSTANT.QUEUE_DELAY;
        const start = new Date();
        const end = new Date(start.getTime() + executionTime);
        return {
            target,
            tool,
            threads,
            start,
            end,
            hackId: (args.hackId) ? args.hackId : this.hackIdCounter++
        };
    }
    async executeScheduledHack(ns, scheduledHack, args = {}) {
        let threads = scheduledHack.threads;
        // If we are not prepping, we are allowed to lower the number of threads (i think...?)
        if (!args.isPrep) {
            const maxThreadsAvailable = await HackUtils.computeMaxThreads(ns, scheduledHack.tool, true);
            threads = Math.min(threads, maxThreadsAvailable);
        }
        let threadSpread = await HackUtils.computeThreadSpread(ns, scheduledHack.tool, threads);
        // Create the hack
        const hack = {
            target: scheduledHack.target,
            threadSpread,
            tool: scheduledHack.tool,
            isPrep: (args.isPrep ? args.isPrep : false),
            start: scheduledHack.start,
            end: scheduledHack.end,
            hackId: scheduledHack.hackId
        };
        // Wait until we have to execute
        if (scheduledHack.start > (new Date())) {
            const waitTime = (new Date()).getTime() - scheduledHack.start.getTime();
            await ns.sleep(waitTime);
        }
        // NOTE: We might want to move this to the threadspread loop to show the source servers
        // For now, meh
        if (args.isPrep) {
            ns.tprint(`[${Utils.formatDate()}] [Hack ${scheduledHack.hackId}] Prepping ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`);
        }
        else {
            ns.tprint(`[${Utils.formatDate()}] [Hack ${scheduledHack.hackId}] Attacking ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`);
        }
        this.hackingMap.push(hack);
        for (let [server, threads] of threadSpread) {
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHomeServer(server)) {
                ns.scp(scheduledHack.tool, HomeServer.getInstance(ns).host, server.host);
            }
            ns.exec(scheduledHack.tool, server.host, threads, scheduledHack.target.host);
        }
        const executionTime = scheduledHack.end.getTime() - (new Date()).getTime();
        const lag = Math.min(scheduledHack.start.getTime() - (new Date()).getTime(), 0);
        setTimeout(() => {
            // NOTE: This is heavily effected by how trustworthy the hackId counter is...
            this.hackingMap.find(hack => hack.hackId === scheduledHack.hackId);
            if (args.isPrep) {
                ns.tprint(`[${Utils.formatDate()}] [Hack ${scheduledHack.hackId}] Finished prepping ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`);
            }
            else {
                ns.tprint(`[${Utils.formatDate()}] [Hack ${scheduledHack.hackId}] Finished attacking ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`);
            }
        }, executionTime - lag);
        return hack;
    }
    isPrepping(ns, server) {
        return this.hackingMap.some((hack) => {
            return hack.target === server && hack.isPrep;
        });
    }
    isTargetting(ns, server) {
        return this.hackingMap.some((hack) => {
            return hack.target === server && !hack.isPrep;
        });
    }
}
;
