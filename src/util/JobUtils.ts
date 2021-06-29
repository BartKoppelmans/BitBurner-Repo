import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Server from "/src/classes/Server.js";
import { Tools } from "/src/tools/Tools.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";


export async function computeThreadSpread(ns: NS, tool: Tools, threads: number, isPrep: boolean): Promise<Map<Server, number>> {

    const maxThreadsAvailable = await HackUtils.calculateMaxThreads(ns, tool, isPrep);

    if (threads > maxThreadsAvailable) {
        throw new Error("We don't have that much threads available.");
    }

    const cost: number = ToolUtils.getToolCost(ns, tool);

    let threadsLeft: number = threads;
    let spreadMap: Map<Server, number> = new Map<Server, number>();

    const serverMap: Server[] = (isPrep) ? await ServerAPI.getPreppingServers(ns) : await ServerAPI.getHackingServers(ns);

    for (let server of serverMap) {
        let serverThreads: number = Math.floor(server.getAvailableRam(ns) / cost);

        // If we can't fit any more threads here, skip it
        if (serverThreads === 0) continue;

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