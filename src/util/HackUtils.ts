import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as PlayerUtils from "/src/util/PlayerUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";

// Here we allow thread spreading over multiple servers
export async function calculateMaxThreads(ns: NS, tool: Tools, isPrep: boolean): Promise<number> {

    const serverMap: Server[] = (isPrep) ? await ServerAPI.getPreppingServers(ns) : await ServerAPI.getHackingServers(ns);

    const cost: number = ToolUtils.getToolCost(ns, tool);

    return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
}

export function calculateHackThreads(ns: NS, target: HackableServer): number {
    const hackAmount: number = target.percentageToSteal * target.staticHackingProperties.maxMoney;
    return ns.hackAnalyzeThreads(target.characteristics.host, hackAmount);
}

export function calculateWeakenThreads(ns: NS, target: HackableServer, start = target.getSecurityLevel(ns), goal = target.staticHackingProperties.minSecurityLevel) {
    return Math.ceil((start - goal) / PlayerUtils.getWeakenPotency(ns));
}

export function calculateGrowthThreads(ns: NS, target: HackableServer, start = target.getMoney(ns), goal = target.staticHackingProperties.maxMoney) {
    const growthFactor: number = 1 + ((goal - start) / start);
    return Math.ceil(ns.growthAnalyze(target.characteristics.host, growthFactor));
}

export function calculateCompensationWeakenThreads(ns: NS, target: HackableServer, after: Tools, threads: number): number {
    switch (after) {
        case Tools.GROW:
            return Math.ceil(threads * CONSTANT.GROW_HARDENING / PlayerUtils.getWeakenPotency(ns));
        case Tools.HACK:
            return Math.ceil(threads * CONSTANT.HACK_HARDENING / PlayerUtils.getWeakenPotency(ns));
        default:
            throw new Error("We did not recognize the tool");
    }
}

// This is always after a hack
export function calculateCompensationGrowthThreads(ns: NS, target: HackableServer, threads: number): number {
    const hackAmount: number = ((threads * ns.hackAnalyzePercent(target.characteristics.host)) / 100) * target.staticHackingProperties.maxMoney;
    const startAmount: number = target.getMoney(ns) - hackAmount;

    return calculateGrowthThreads(ns, target, startAmount);
}