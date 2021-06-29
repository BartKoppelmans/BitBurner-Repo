import * as ServerAPI from "/src/api/ServerAPI.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
export async function computeThreadSpread(ns, tool, threads, isPrep) {
    const maxThreadsAvailable = await HackUtils.calculateMaxThreads(ns, tool, isPrep);
    if (threads > maxThreadsAvailable) {
        throw new Error("We don't have that much threads available.");
    }
    const cost = ToolUtils.getToolCost(ns, tool);
    let threadsLeft = threads;
    let spreadMap = new Map();
    const serverMap = (isPrep) ? await ServerAPI.getPreppingServers(ns) : await ServerAPI.getHackingServers(ns);
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
