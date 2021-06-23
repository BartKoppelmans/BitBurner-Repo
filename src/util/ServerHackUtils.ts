import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";


export function serverGrowthPercentage(ns: NS, target: HackableServer): number {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);

    return ns.getServerGrowth(target.characteristics.host) * playerManager.getGrowthMultiplier() / 100;
}

export function adjustedGrowthRate(ns: NS, target: HackableServer): number {
    return Math.min(CONSTANT.MAX_GROWTH_RATE, 1 + ((CONSTANT.UNADJUSTED_GROWTH_RATE - 1) / target.staticHackingProperties.minSecurityLevel));
}

export function serverGrowthRate(ns: NS, target: HackableServer): number {
    return Math.pow(adjustedGrowthRate(ns, target), serverGrowthPercentage(ns, target));
}

export function targetGrowthCoefficient(ns: NS, target: HackableServer) {
    return target.staticHackingProperties.maxMoney / Math.max(target.dynamicHackingProperties.money, 1);
}

export function targetGrowthCoefficientAfterTheft(ns: NS, target: HackableServer) {
    return 1 / (1 - (hackThreadsNeeded(ns, target) * percentageStolenPerHackThread(ns, target)));
}

export function cyclesNeededForGrowthCoefficient(ns: NS, target: HackableServer) {
    return Math.log(targetGrowthCoefficient(ns, target)) / Math.log(adjustedGrowthRate(ns, target));
}

export function cyclesNeededForGrowthCoefficientAfterTheft(ns: NS, target: HackableServer) {
    return Math.log(targetGrowthCoefficientAfterTheft(ns, target)) / Math.log(adjustedGrowthRate(ns, target));
}

export function hackEaseCoefficient(ns: NS, target: HackableServer) {
    return (100 - Math.min(100, target.staticHackingProperties.minSecurityLevel)) / 100;
}

export function hackingSkillCoefficient(ns: NS, target: HackableServer) {
    return (ns.getHackingLevel() - (target.staticHackingProperties.hackingLevel - 1)) / ns.getHackingLevel();
}

export function actualHackCoefficient(ns: NS, target: HackableServer) {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);

    return hackEaseCoefficient(ns, target) * hackingSkillCoefficient(ns, target) * playerManager.getHackMultiplier() / 240;
}

export function percentageStolenPerHackThread(ns: NS, target: HackableServer) {
    return Math.min(1, Math.max(0, actualHackCoefficient(ns, target)));
}

export function actualPercentageToSteal(ns: NS, target: HackableServer) {
    return hackThreadsNeeded(ns, target) * percentageStolenPerHackThread(ns, target);
}

export function hackThreadsNeeded(ns: NS, target: HackableServer) {
    return Math.floor(target.dynamicHackingProperties.percentageToSteal / percentageStolenPerHackThread(ns, target));
}

export function growThreadsNeeded(ns: NS, target: HackableServer) {
    return Math.ceil(cyclesNeededForGrowthCoefficient(ns, target) / serverGrowthPercentage(ns, target));
}

export function weakenThreadsNeeded(ns: NS, target: HackableServer) {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);

    return Math.ceil((target.dynamicHackingProperties.securityLevel - target.staticHackingProperties.minSecurityLevel) / playerManager.getWeakenPotency());
}

export function growThreadsNeededAfterTheft(ns: NS, target: HackableServer) {
    return Math.ceil(cyclesNeededForGrowthCoefficientAfterTheft(ns, target) / serverGrowthPercentage(ns, target));
}

export function weakenThreadsNeededAfterTheft(ns: NS, target: HackableServer) {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);

    return Math.ceil(hackThreadsNeeded(ns, target) * CONSTANT.HACK_HARDENING / playerManager.getWeakenPotency());
}

export function weakenThreadsNeededAfterGrowth(ns: NS, target: HackableServer) {
    const playerManager: PlayerManager = PlayerManager.getInstance(ns);
    return Math.ceil(growThreadsNeededAfterTheft(ns, target) * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
}

export function weakenThreadTotalPerCycle(ns: NS, target: HackableServer) {
    return (weakenThreadsNeededAfterTheft(ns, target) + weakenThreadsNeededAfterGrowth(ns, target));
}

export function computeOptimalCycles(ns: NS, target: HackableServer) {
    const fullWeakenTime: number = ns.getWeakenTime(target.characteristics.host) * CONSTANT.MILLISECONDS_IN_SECOND - CONSTANT.QUEUE_DELAY;
    return Math.min(CONSTANT.MAX_CYCLE_NUMBER, Math.max(1, Math.floor(fullWeakenTime / CONSTANT.QUEUE_DELAY)));
}