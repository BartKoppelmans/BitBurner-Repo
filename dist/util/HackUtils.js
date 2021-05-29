import { ServerManager } from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
export default class HackUtils {
    // Here we allow thread spreading over multiple servers
    static async computeMaxThreads(ns, tool, allowSpread = true) {
        const serverMap = await this.getHackingServers(ns);
        const cost = this.getToolCost(ns, tool);
        // NOTE: We always expect AT LEAST 1 rooted server to be available
        if (!allowSpread) {
            const server = serverMap.shift();
            return Math.floor(server.getAvailableRam(ns) / cost);
        }
        return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
    }
    static async computeMaxCycles(ns, cycleCost, allowSpread = true) {
        const serverMap = await this.getHackingServers(ns);
        // NOTE: We always expect AT LEAST 1 rooted server to be available
        if (!allowSpread) {
            const server = serverMap.shift();
            return Math.floor(server.getAvailableRam(ns) / cycleCost);
        }
        return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cycleCost), 0);
    }
    static async computeThreadsNeeded(ns, tool, server) {
        switch (tool) {
            case Tools.GROW:
                return ServerHackUtils.growThreadsNeeded(ns, server);
            case Tools.WEAKEN:
                return ServerHackUtils.weakenThreadsNeeded(ns, server);
            case Tools.HACK:
                return ServerHackUtils.hackThreadsNeeded(ns, server);
            default:
                throw new Error("Tool not recognized");
        }
    }
    static async computeThreadSpread(ns, tool, threads) {
        const serverMap = await this.getHackingServers(ns);
        const maxThreadsAvailable = await this.computeMaxThreads(ns, tool, true);
        if (threads > maxThreadsAvailable) {
            throw new Error("We don't have that much threads available.");
        }
        const cost = this.getToolCost(ns, tool);
        let threadsLeft = threads;
        let spreadMap = new Map();
        for (let server of serverMap) {
            let serverThreads = Math.floor(server.getAvailableRam(ns) / cost);
            // If we can't fit any more threads here, skip it
            if (serverThreads === 0)
                continue;
            // We can fit all our threads in here!
            if (serverThreads >= threadsLeft) {
                spreadMap.set(server, threadsLeft);
                break;
            }
            spreadMap.set(server, serverThreads);
            threadsLeft -= serverThreads;
        }
        return spreadMap;
    }
    static async getHackingServers(ns) {
        // TODO: Do we want to filter out home?
        return (await ServerManager.getInstance(ns).getServerMap(ns, true))
            .filter((server) => server.isRooted(ns))
            .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    }
    static getToolCost(ns, tool) {
        return ns.getScriptRam(tool);
    }
    static getToolTime(ns, tool, server) {
        switch (tool) {
            case Tools.GROW:
                return ns.getGrowTime(server.host);
            case Tools.WEAKEN:
                return ns.getWeakenTime(server.host);
            case Tools.HACK:
                return ns.getHackTime(server.host);
            default:
                throw new Error("Tool not recognized");
        }
    }
}
