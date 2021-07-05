import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as PlayerUtils from "/src/util/PlayerUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
// Here we allow thread spreading over multiple servers
export async function calculateMaxThreads(ns, tool, isPrep) {
    const serverMap = (isPrep) ? await ServerAPI.getPreppingServers(ns) : await ServerAPI.getHackingServers(ns);
    const cost = ToolUtils.getToolCost(ns, tool);
    return serverMap.reduce((threads, server) => threads + Math.floor(server.getAvailableRam(ns) / cost), 0);
}
export function calculateHackThreads(ns, target) {
    const hackAmount = target.percentageToSteal * target.staticHackingProperties.maxMoney;
    return ns.hackAnalyzeThreads(target.characteristics.host, hackAmount);
}
export function calculateWeakenThreads(ns, target, start = target.getSecurityLevel(ns), goal = target.staticHackingProperties.minSecurityLevel) {
    return Math.ceil((start - goal) / PlayerUtils.getWeakenPotency(ns));
}
export function calculateGrowthThreads(ns, target, start = target.getMoney(ns), goal = target.staticHackingProperties.maxMoney) {
    const growthFactor = 1 + ((goal - start) / start);
    if (growthFactor < 1) {
        return 0;
    }
    return Math.ceil(ns.growthAnalyze(target.characteristics.host, growthFactor));
}
export function calculateCompensationWeakenThreads(ns, target, after, threads) {
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
export function calculateCompensationGrowthThreads(ns, target, threads) {
    const hackAmount = ((threads * ns.hackAnalyzePercent(target.characteristics.host)) / 100) * target.staticHackingProperties.maxMoney;
    const startAmount = target.getMoney(ns) - hackAmount;
    return calculateGrowthThreads(ns, target, startAmount);
}
