import { ServerManager } from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
import ToolUtils from "/src/util/ToolUtils.js";
export default class JobUtils {
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
    // Here we allow thread spreading over multiple servers
    static async computeMaxThreads(ns, tool, allowSpread = true) {
        const serverManager = ServerManager.getInstance(ns);
        const serverMap = await serverManager.getHackingServers(ns);
        const cost = ToolUtils.getToolCost(ns, tool);
        if (!allowSpread) {
            // NOTE: We always expect AT LEAST 1 rooted server to be available
            const server = serverMap.shift();
            return Math.floor(server.getAvailableRam(ns) / cost);
        }
        return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
    }
    static async computeThreadSpread(ns, tool, threads) {
        const serverManager = ServerManager.getInstance(ns);
        const serverMap = await serverManager.getHackingServers(ns);
        // TODO: Remove this because we should already check it?
        const maxThreadsAvailable = await this.computeMaxThreads(ns, tool, true);
        if (threads > maxThreadsAvailable) {
            throw new Error("We don't have that much threads available.");
        }
        const cost = ToolUtils.getToolCost(ns, tool);
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
}
