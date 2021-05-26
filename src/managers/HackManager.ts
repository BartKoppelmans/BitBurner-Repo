import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import HomeServer from "/src/classes/HomeServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { Tools } from "/src/tools/Tools.js";
import HackUtils from "/src/util/HackUtils.js";

interface Hack {
    // The target of the hack
    target: HackableServer;

    // The servers where we are hacking from, and the number of threads
    threadSpread: Map<Server, number>;

    // The type of the hack
    tool: Tools;

    // Whether the hack is intended to prep the server
    isPrep: boolean;

    // The start of the hack
    start: Date;

    // The intended end of the hack
    end: Date;
}

export class HackManager {
    private static instance: HackManager;

    private hackingMap: Hack[] = [];
    private targetCounter: number = 0;

    private constructor() { }

    public static getInstance(): HackManager {
        if (!HackManager.instance) {
            HackManager.instance = new HackManager();
        }

        return HackManager.instance;
    }

    // Return false when we have too many targets
    public async hack(ns: NS, server: HackableServer): Promise<void> {

        // TODO: Make sure that all neccesary variables are set (remove the exclamation marks)

        // Can't have too many targets at the same time
        if (this.targetCounter >= CONSTANT.MAX_TARGET_COUNT) {

            // Reset the counter, as we start checking them all out after this
            this.targetCounter = 0;

            throw new TooManyTargetsError("Too many targets, abort!");
        }

        // If it is prepping, leave it
        if (this.isPrepping(ns, server)) return;

        // We have found ourselves a viable target!
        this.targetCounter++;

        // It is a target, but is currently resting
        if (this.isTargetting(ns, server)) return;

        // Prep the server
        await this.prepServer(ns, server);

        // The server is not optimal, other targets take up the RAM
        if (server.securityLevel! > server.minSecurityLevel || server.money! < server.maxMoney) return;

        // If it is prepping, leave it
        if (this.isPrepping(ns, server)) return;

        // TODO: Optimize performance metrics

        await this.attackServer(ns, server);
    }

    private async prepServer(ns: NS, server: HackableServer): Promise<void> {
        // We should not prep anymore once we are targetting
        if (this.isTargetting(ns, server)) return;

        // If the server is optimal, we are done I guess
        if (server.securityLevel! === server.minSecurityLevel && server.money! === server.maxMoney) return;

        ns.tprint(`Prepping ${server.host}`);

        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        // TODO: Move constants to util

        let growThreads: number = 0;
        let weakenThreads: number = 0;

        let weakenThreadsNeeded: number = await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server);

        // First grow, so that the amount of money is optimal
        if (server.money! < server.maxMoney) {
            let maxGrowThreads: number = await HackUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
            let neededGrowThreads: number = await HackUtils.computeThreadsNeeded(ns, Tools.GROW, server);

            // The grow threads that are available and needed
            growThreads = Math.min(maxGrowThreads, neededGrowThreads);

            // The number of weaken threads needed to compensate for growth
            let compensationWeakenThreads: number = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());

            let growThreadThreshold: number = (maxGrowThreads - neededGrowThreads) * (HackUtils.getToolCost(ns, Tools.GROW) / HackUtils.getToolCost(ns, Tools.WEAKEN));

            let releasedGrowThreads: number = (HackUtils.getToolCost(ns, Tools.WEAKEN) / HackUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);

            if (growThreadThreshold >= releasedGrowThreads) {
                releasedGrowThreads = 0;
            }
            growThreads -= releasedGrowThreads;

            if (growThreads > 0) {
                await this.executeTool(ns, Tools.GROW, growThreads, server, { isPrep: true });
            }

            // Add the compensation weaken threads to the needed weaken threads
            weakenThreadsNeeded += compensationWeakenThreads;
        }

        let maxWeakenThreads: number = await HackUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
        weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);

        if (weakenThreads > 0) {
            await this.executeTool(ns, Tools.WEAKEN, growThreads, server, { isPrep: true });
        }

    }

    private async attackServer(ns: NS, server: HackableServer): Promise<void> {
        ns.tprint(`Attacking ${server.host}`);
    }

    private async executeTool(ns: NS, tool: Tools, threads: number = 1, target: HackableServer, args: any): Promise<Hack> {
        let threadSpread: Map<Server, number> = await HackUtils.computeThreadSpread(ns, tool, threads);

        threadSpread.forEach((threads: number, server: Server) => {
            // We have to copy the tool to the server if it is not available yet
            if (!server.isHome()) {
                ns.scp(tool, HomeServer.getInstance().host, server.host);
            }

            ns.exec(tool, server.host, threads, target.host);
        });

        const executionTime: number = HackUtils.getToolTime(ns, tool, target) * CONSTANT.MILLISECONDS_IN_SECOND + CONSTANT.QUEUE_DELAY;
        const start: Date = new Date();
        const end: Date = new Date(start.getTime() + executionTime);

        const hack: Hack = {
            target,
            threadSpread,
            tool,
            isPrep: (args.isPrep ? args.isPrep : false),
            start,
            end,
        };

        this.hackingMap.push(hack);

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
}