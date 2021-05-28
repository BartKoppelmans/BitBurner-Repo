import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import { Tools } from "/src/tools/Tools.js";

export default class HackUtils {

    // Here we allow thread spreading over multiple servers
    static async computeMaxThreads(ns: NS, tool: Tools, allowSpread: boolean = true): Promise<number> {

        const serverMap: Server[] = await this.getHackingServers(ns);
        const cost: number = this.getToolCost(ns, tool);

        // NOTE: We always expect AT LEAST 1 rooted server to be available

        if (!allowSpread) {
            const server: Server = serverMap.shift() as Server;
            return Math.floor(server.getAvailableRam(ns) / cost);
        }

        return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
    }

    static async computeThreadsNeeded(ns: NS, tool: Tools, server: HackableServer): Promise<number> {

        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        switch (tool) {
            case Tools.GROW:
                const targetGrowthCoefficient: number = server.staticHackingProperties.maxMoney / (Math.max(server.dynamicHackingProperties.money, 1));
                const adjustedGrowthRate: number = Math.min(
                    CONSTANT.MAX_GROWTH_RATE,
                    1 + ((CONSTANT.UNADJUSTED_GROWTH_RATE - 1) / server.staticHackingProperties.minSecurityLevel)
                );
                const neededCycles: number = Math.log(targetGrowthCoefficient) / Math.log(adjustedGrowthRate);
                const serverGrowthPercentage: number = ns.getServerGrowth(server.host) * playerManager.getGrowthMultiplier() / 100;

                return Math.ceil(neededCycles / serverGrowthPercentage);

            case Tools.WEAKEN:
                return Math.ceil((server.dynamicHackingProperties.securityLevel - server.staticHackingProperties.minSecurityLevel) / playerManager.getWeakenPotency());
            case Tools.HACK:
                throw new Error("Not implemented yet");
            default:
                throw new Error("Tool not recognized");
        }

    }

    static async computeThreadSpread(ns: NS, tool: Tools, threads: number): Promise<Map<Server, number>> {

        const serverMap: Server[] = await this.getHackingServers(ns);
        const maxThreadsAvailable = await this.computeMaxThreads(ns, tool, true);

        if (threads > maxThreadsAvailable) {
            throw new Error("We don't have that much threads available.");
        }

        const cost: number = this.getToolCost(ns, tool);
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

    static async getHackingServers(ns: NS): Promise<Server[]> {

        // TODO: Do we want to filter out home?

        return (await ServerManager.getInstance(ns).getServerMap(ns, true))
            .filter((server: Server) => server.isRooted(ns))
            .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    }

    static getToolCost(ns: NS, tool: Tools): number {
        return ns.getScriptRam(tool);
    }

    static getToolTime(ns: NS, tool: Tools, server: HackableServer) {
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