import HomeServer from "/src/classes/HomeServer";
import { CONSTANT } from "/src/lib/constants";
import { PlayerManager } from "/src/managers/PlayerManager";
import { Tools } from "/src/tools/Tools";
import HackUtils from "/src/util/HackUtils";
export class HackManager {
    constructor() {
        this.hackingMap = [];
        this.targetCounter = 0;
    }
    static getInstance() {
        if (!HackManager.instance) {
            HackManager.instance = new HackManager();
        }
        return HackManager.instance;
    }
    // Return false when we have too many targets
    async hack(ns, server) {
        // TODO: Make sure that all neccesary variables are set (remove the exclamation marks)
        // Can't have too many targets at the same time
        if (this.targetCounter >= CONSTANT.MAX_TARGET_COUNT) {
            // Reset the counter, as we start checking them all out after this
            this.targetCounter = 0;
            throw new Error("Too many targets, abort!");
        }
        // If it is prepping, leave it
        if (this.isPrepping(ns, server))
            return;
        // We have found ourselves a viable target!
        this.targetCounter++;
        // It is a target, but is currently resting
        if (this.isTargetting(ns, server))
            return;
        // Prep the server
        await this.prepServer(ns, server);
        // The server is not optimal, other targets take up the RAM
        if (server.securityLevel > server.minSecurityLevel || server.money < server.maxMoney)
            return;
        // If it is prepping, leave it
        if (this.isPrepping(ns, server))
            return;
        // TODO: Optimize performance metrics
        await this.attackServer(ns, server);
    }
    async prepServer(ns, server) {
        // We should not prep anymore once we are targetting
        if (this.isTargetting(ns, server))
            return;
        // If the server is optimal, we are done I guess
        if (server.securityLevel <= server.minSecurityLevel && server.money >= server.maxMoney)
            return;
        const playerManager = PlayerManager.getInstance(ns);
        // TODO: Move constants to util
        let growThreads = 0;
        let weakenThreads = 0;
        let weakenThreadsNeeded = await HackUtils.computeThreadsNeeded(ns, Tools.WEAKEN, server);
        // First grow, so that the amount of money is optimal
        if (server.money < server.maxMoney) {
            let maxGrowThreads = await HackUtils.computeMaxThreads(ns, Tools.GROW, CONSTANT.ALLOW_THREAD_SPREADING);
            let neededGrowThreads = await HackUtils.computeThreadsNeeded(ns, Tools.GROW, server);
            // The grow threads that are available and needed
            growThreads = Math.min(maxGrowThreads, neededGrowThreads);
            // The number of weaken threads needed to compensate for growth
            let compensationWeakenThreads = Math.ceil(growThreads * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
            let growThreadThreshold = (maxGrowThreads - neededGrowThreads) * (HackUtils.getToolCost(ns, Tools.GROW) / HackUtils.getToolCost(ns, Tools.WEAKEN));
            let releasedGrowThreads = (HackUtils.getToolCost(ns, Tools.WEAKEN) / HackUtils.getToolCost(ns, Tools.GROW)) * (compensationWeakenThreads + weakenThreadsNeeded);
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
        let maxWeakenThreads = await HackUtils.computeMaxThreads(ns, Tools.WEAKEN, CONSTANT.ALLOW_THREAD_SPREADING);
        weakenThreads = Math.min(weakenThreadsNeeded, maxWeakenThreads);
        if (weakenThreads > 0) {
            await this.executeTool(ns, Tools.WEAKEN, growThreads, server, { isPrep: true });
        }
    }
    async attackServer(ns, server) {
    }
    async executeTool(ns, tool, threads = 1, target, args) {
        let threadSpread = await HackUtils.computeThreadSpread(ns, tool, threads);
        threadSpread.forEach((threads, server) => {
            // We have to copy the tool to the server if it is not available yet
            if (!server.isHome()) {
                ns.scp(tool, HomeServer.getInstance().host, server.host);
            }
            ns.exec(tool, server.host, threads, target.host);
        });
        const executionTime = HackUtils.getToolTime(ns, tool, target) * CONSTANT.MILLISECONDS_IN_SECOND + CONSTANT.QUEUE_DELAY;
        const start = new Date();
        const end = new Date(start.getTime() + executionTime);
        const hack = {
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
