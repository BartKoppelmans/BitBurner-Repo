import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import HomeServer from "/src/classes/HomeServer.js";
import Server from "/src/classes/Server.js";
import { Batch, Cycle, Hack, HackArguments, ScheduledHack } from "/src/interfaces/HackManagerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import HackUtils from "/src/util/HackUtils.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
import ServerUtils from "/src/util/ServerUtils.js";
import Utils from "/src/util/Utils.js";

export class HackManager {
    private static instance: HackManager;

    private hackingMap: Hack[] = [];

    private hackIdCounter: number = 1;

    private constructor() { }

    public static getInstance(): HackManager {
        if (!HackManager.instance) {
            HackManager.instance = new HackManager();
        }

        return HackManager.instance;
    }

    // Return true when we have found a new target
    public async hack(ns: NS, server: HackableServer): Promise<boolean> {

        // Print the hacking map for debugging
        // const hackIdMap: number[] = this.hackingMap.map(hack => hack.hackId);
        // ns.tprint(hackIdMap);

        // TODO: Make sure that all neccesary variables are set (remove the exclamation marks)

        // If it is prepping, leave it
        if (this.isPrepping(ns, server)) return false;

        // From here on it is a target

        // It is a target, but is currently resting
        if (this.isTargetting(ns, server)) return true;

        // Prep the server
        await this.prepServer(ns, server);

        // The server is not optimal, other targets take up the RAM
        if (server.dynamicHackingProperties.securityLevel > server.staticHackingProperties.minSecurityLevel || server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney) return true;

        // If it is prepping, leave it
        if (this.isPrepping(ns, server)) return true;

        // TODO: Optimize performance metrics

        await this.attackServer(ns, server);

        return true;
    }

    private async prepServer(ns: NS, server: HackableServer): Promise<void> {
        // We should not prep anymore once we are targetting
        if (this.isTargetting(ns, server)) return;

        // If the server is optimal, we are done I guess
        if (server.dynamicHackingProperties.securityLevel === server.staticHackingProperties.minSecurityLevel && server.dynamicHackingProperties.money === server.staticHackingProperties.maxMoney) return;

        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        let growThreads: number = 0;
        let weakenThreads: number = 0;
        let compensationWeakenThreads: number = 0;

        // First grow, so that the amount of money is optimal
        if (server.dynamicHackingProperties.money < server.staticHackingProperties.maxMoney) {
            let maxGrowThreads: number = await HackUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
            let neededGrowThreads: number = await HackUtils.computeThreadsNeeded(ns, Tools.GROW, server);
            let weakenThreadsNeeded: number = await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server);

            // The grow threads that are available and needed
            growThreads = Math.min(maxGrowThreads, neededGrowThreads);

            // The number of weaken threads needed to compensate for growth
            compensationWeakenThreads = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());

            let growThreadThreshold: number = (maxGrowThreads - neededGrowThreads) * (HackUtils.getToolCost(ns, Tools.GROW) / HackUtils.getToolCost(ns, Tools.WEAKEN));

            let releasedGrowThreads: number = (HackUtils.getToolCost(ns, Tools.WEAKEN) / HackUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);

            if (growThreadThreshold >= releasedGrowThreads) {
                releasedGrowThreads = 0;
            }
            growThreads -= releasedGrowThreads;

            if (growThreads > 0) {
                await this.executeTool(ns, Tools.GROW, growThreads, server, { isPrep: true });
            }
        }

        let weakenThreadsNeeded: number = (await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server)) + compensationWeakenThreads;
        let maxWeakenThreads: number = await HackUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
        weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);

        if (weakenThreads > 0) {
            await this.executeTool(ns, Tools.WEAKEN, weakenThreads, server, { isPrep: true });
        }

    }

    private async attackServer(ns: NS, target: HackableServer): Promise<void> {

        let cycles: Cycle[] = [];

        let batchStart: Date = new Date();
        batchStart.setTime(batchStart.getTime() + CONSTANT.CYCLE_DELAY);

        // TODO: Measure how many cycles would be optimal and take the minimum with the max_cycle_number
        // For now just always run 10 cycles
        const numCycles: number = CONSTANT.MAX_CYCLE_NUMBER;

        for (let i = 0; i < numCycles; i++) {

            let cycleStart: Date;

            // Set the start time of the cycle
            if (cycles.length > 0) {
                const lastCycle: Cycle = cycles[cycles.length - 1];

                cycleStart = new Date(lastCycle.end);
                cycleStart.setTime(lastCycle.end.getTime() + CONSTANT.CYCLE_DELAY);
            } else {
                cycleStart = new Date(batchStart);
            }

            let cycle: Cycle = await this.scheduleCycle(ns, target, i, cycleStart);
            cycles.push(cycle);

            await ns.sleep(CONSTANT.SMALL_DELAY);
        }

        if (cycles.length === 0) {
            throw new Error("No cycles created");
        }

        // Create the batch object
        const batch: Batch = {
            target,
            cycles,
            start: batchStart,
            end: cycles[cycles.length - 1].end
        };

        // Execute the batch object
        for (const cycle of cycles) {
            for (const hack of cycle.hacks) {

                // TODO: Wait until there are enough threads available

                await this.executeScheduledHack(ns, hack);
            }
        }
    }

    private async scheduleCycle(ns: NS, target: HackableServer, cycleNumber: number, batchStart: Date): Promise<Cycle> {
        const schedHack1: ScheduledHack = await this.createCycleHack(ns, target, Tools.HACK, batchStart);

        let schedHack2Start: Date = new Date(schedHack1.end);
        schedHack2Start.setTime(schedHack2Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack2: ScheduledHack = await this.createCycleHack(ns, target, Tools.WEAKEN, schedHack2Start, true);

        let schedHack3Start: Date = new Date(schedHack2.end);
        schedHack3Start.setTime(schedHack3Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack3: ScheduledHack = await this.createCycleHack(ns, target, Tools.GROW, schedHack3Start);

        let schedHack4Start: Date = new Date(schedHack3.end);
        schedHack4Start.setTime(schedHack4Start.getTime() + CONSTANT.CYCLE_DELAY);
        const schedHack4: ScheduledHack = await this.createCycleHack(ns, target, Tools.WEAKEN, schedHack4Start, false);

        return {
            cycleNumber,
            target,
            hacks: [schedHack1, schedHack2, schedHack3, schedHack4],
            start: batchStart,
            end: new Date(schedHack4.end)
        };
    }


    private async createCycleHack(ns: NS, target: HackableServer, tool: Tools, start: Date, isFirstWeaken: boolean = false): Promise<ScheduledHack> {

        let threads: number;
        let end: Date = new Date(start);

        if (tool === Tools.HACK) {
            const hackTime: number = ns.getHackTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
            end.setTime(start.getTime() + hackTime);

            threads = ServerHackUtils.hackThreadsNeeded(ns, target);
        }
        else if (tool === Tools.WEAKEN) {

            const weakenTime: number = ns.getWeakenTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
            end.setTime(start.getTime() + weakenTime);

            threads = (isFirstWeaken) ? ServerHackUtils.weakenThreadsNeededAfterTheft(ns, target) : ServerHackUtils.weakenThreadsNeededAfterGrowth(ns, target);

        }
        else if (tool === Tools.GROW) {
            const growTime: number = ns.getGrowTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND;
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
    private getOptimalBatchCost(ns: NS, target: HackableServer): number {
        // TODO: Refactor this shitshow

        const weakenCost: number = ServerHackUtils.weakenThreadTotalPerCycle(ns, target);
        const growCost: number = ServerHackUtils.growThreadsNeededAfterTheft(ns, target);
        const hackCost: number = ServerHackUtils.hackThreadsNeeded(ns, target);

        return weakenCost + growCost + hackCost;
    }

    private async executeTool(ns: NS, tool: Tools, threads: number = 1, target: HackableServer, args: HackArguments = {}): Promise<Hack> {

        const scheduledHack: ScheduledHack = await this.scheduleHack(ns, tool, threads, target, args);
        const hack: Hack = await this.executeScheduledHack(ns, scheduledHack, args);

        return hack;
    }

    private async scheduleHack(ns: NS, tool: Tools, threads: number = 1, target: HackableServer, args: HackArguments = {}): Promise<ScheduledHack> {

        const executionTime: number = HackUtils.getToolTime(ns, tool, target) * CONSTANT.MILLISECONDS_IN_SECOND + CONSTANT.QUEUE_DELAY;
        const start: Date = new Date();
        const end: Date = new Date(start.getTime() + executionTime);

        return {
            target,
            tool,
            threads,
            start,
            end,
            hackId: (args.hackId) ? args.hackId : this.hackIdCounter++
        };
    }

    private async executeScheduledHack(ns: NS, scheduledHack: ScheduledHack, args: HackArguments = {}): Promise<Hack> {

        let threads: number = scheduledHack.threads;

        // If we are not prepping, we are allowed to lower the number of threads (i think...?)
        // TODO: Refactor this so that we wait with hacking until enough threads are available or smth
        if (!args.isPrep) {
            const maxThreadsAvailable: number = await HackUtils.computeMaxThreads(ns, scheduledHack.tool, true);
            threads = Math.min(threads, maxThreadsAvailable);
        }

        let threadSpread: Map<Server, number> = await HackUtils.computeThreadSpread(ns, scheduledHack.tool, threads);

        // Create the hack
        const hack: Hack = {
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
            const waitTime: number = (new Date()).getTime() - scheduledHack.start.getTime();
            await ns.sleep(waitTime);
        }


        // NOTE: We might want to move this to the threadspread loop to show the source servers
        // For now, meh
        if (args.isPrep) {

            Utils.tprintColored(`${Utils.formatHackId(ns, scheduledHack.hackId)} Prepping ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`, true);
        } else {
            Utils.tprintColored(`${Utils.formatHackId(ns, scheduledHack.hackId)} Attacking ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`, true);
        }

        this.hackingMap.push(hack);
        for (let [server, threads] of threadSpread) {
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHomeServer(server)) {
                ns.scp(scheduledHack.tool, HomeServer.getInstance(ns).host, server.host);
            }

            ns.exec(scheduledHack.tool, server.host, threads, scheduledHack.target.host);
        }

        const executionTime: number = scheduledHack.end.getTime() - (new Date()).getTime();
        const lag: number = Math.min(scheduledHack.start.getTime() - (new Date()).getTime(), 0);

        setTimeout(() => {
            // NOTE: This is heavily effected by how trustworthy the hackId counter is...
            const index: number = this.hackingMap.findIndex(hack => hack.hackId === scheduledHack.hackId);

            if (index === -1) {
                throw new Error("Could not find the hack");
            }

            this.hackingMap.splice(index, 1);

            if (args.isPrep) {
                Utils.tprintColored(`${Utils.formatHackId(ns, scheduledHack.hackId)} Finished prepping ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`, true);
            } else {
                Utils.tprintColored(`${Utils.formatHackId(ns, scheduledHack.hackId)} Finished attacking ${scheduledHack.target.host} - ${Utils.getToolName(scheduledHack.tool)}`, true);
            }
        }, executionTime - lag);

        return hack;
    }

    private isPrepping(ns: NS, server: Server): boolean {
        return this.hackingMap.some((hack: Hack) => {
            return hack.target === server && hack.isPrep;
        });
    }

    private isTargetting(ns: NS, server: Server): boolean {
        return this.hackingMap.some((hack: Hack) => {
            return hack.target === server && !hack.isPrep;
        });
    }
};