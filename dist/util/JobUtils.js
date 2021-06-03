import { serverManager } from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";
import * as ServerHackUtils from "/src/util/ServerHackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
export async function computeThreadsNeeded(ns, tool, server) {
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
export async function computeMaxThreads(ns, tool, allowSpread = true) {
    const serverMap = await serverManager.getHackingServers(ns);
    const cost = ToolUtils.getToolCost(ns, tool);
    if (!allowSpread) {
        // NOTE: We always expect AT LEAST 1 rooted server to be available
        const server = serverMap.shift();
        return Math.floor(server.getAvailableRam(ns) / cost);
    }
    return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
}
export async function computeThreadSpread(ns, tool, threads) {
    // TODO: Remove this because we should already check it?
    const maxThreadsAvailable = await computeMaxThreads(ns, tool, true);
    if (threads > maxThreadsAvailable) {
        throw new Error("We don't have that much threads available.");
    }
    const cost = ToolUtils.getToolCost(ns, tool);
    let threadsLeft = threads;
    let spreadMap = new Map();
    const serverMap = await serverManager.getHackingServers(ns);
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
