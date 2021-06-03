import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import ServerManager from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";
import ServerHackUtils from "/src/util/ServerHackUtils.js";
import ToolUtils from "/src/util/ToolUtils.js";

export default class JobUtils {

    static async computeThreadsNeeded(ns: NS, tool: Tools, server: HackableServer): Promise<number> {
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
    static async computeMaxThreads(ns: NS, tool: Tools, allowSpread: boolean = true): Promise<number> {

        const serverManager: ServerManager = ServerManager.getInstance(ns);

        const serverMap: Server[] = await serverManager.getHackingServers(ns);
        const cost: number = ToolUtils.getToolCost(ns, tool);

        if (!allowSpread) {
            // NOTE: We always expect AT LEAST 1 rooted server to be available
            const server: Server = serverMap.shift() as Server;
            return Math.floor(server.getAvailableRam(ns) / cost);
        }

        return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
    }

    static async computeThreadSpread(ns: NS, tool: Tools, threads: number): Promise<Map<Server, number>> {

        const serverManager: ServerManager = ServerManager.getInstance(ns);

        const serverMap: Server[] = await serverManager.getHackingServers(ns);

        // TODO: Remove this because we should already check it?
        const maxThreadsAvailable = await this.computeMaxThreads(ns, tool, true);

        if (threads > maxThreadsAvailable) {
            throw new Error("We don't have that much threads available.");
        }

        const cost: number = ToolUtils.getToolCost(ns, tool);

        let threadsLeft: number = threads;
        let spreadMap: Map<Server, number> = new Map<Server, number>();

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
}