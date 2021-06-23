import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
export function serverGrowthPercentage(ns, target) {
    const playerManager = PlayerManager.getInstance(ns);
    return ns.getServerGrowth(target.characteristics.host) * playerManager.getGrowthMultiplier() / 100;
}
export function adjustedGrowthRate(ns, target) {
    return Math.min(CONSTANT.MAX_GROWTH_RATE, 1 + ((CONSTANT.UNADJUSTED_GROWTH_RATE - 1) / target.staticHackingProperties.minSecurityLevel));
}
export function serverGrowthRate(ns, target) {
    return Math.pow(adjustedGrowthRate(ns, target), serverGrowthPercentage(ns, target));
}
export function targetGrowthCoefficient(ns, target) {
    return target.staticHackingProperties.maxMoney / Math.max(target.dynamicHackingProperties.money, 1);
}
export function targetGrowthCoefficientAfterTheft(ns, target) {
    return 1 / (1 - (hackThreadsNeeded(ns, target) * percentageStolenPerHackThread(ns, target)));
}
export function cyclesNeededForGrowthCoefficient(ns, target) {
    return Math.log(targetGrowthCoefficient(ns, target)) / Math.log(adjustedGrowthRate(ns, target));
}
export function cyclesNeededForGrowthCoefficientAfterTheft(ns, target) {
    return Math.log(targetGrowthCoefficientAfterTheft(ns, target)) / Math.log(adjustedGrowthRate(ns, target));
}
export function hackEaseCoefficient(ns, target) {
    return (100 - Math.min(100, target.staticHackingProperties.minSecurityLevel)) / 100;
}
export function hackingSkillCoefficient(ns, target) {
    return (ns.getHackingLevel() - (target.staticHackingProperties.hackingLevel - 1)) / ns.getHackingLevel();
}
export function actualHackCoefficient(ns, target) {
    const playerManager = PlayerManager.getInstance(ns);
    return hackEaseCoefficient(ns, target) * hackingSkillCoefficient(ns, target) * playerManager.getHackMultiplier() / 240;
}
export function percentageStolenPerHackThread(ns, target) {
    return Math.min(1, Math.max(0, actualHackCoefficient(ns, target)));
}
export function actualPercentageToSteal(ns, target) {
    return hackThreadsNeeded(ns, target) * percentageStolenPerHackThread(ns, target);
}
export function hackThreadsNeeded(ns, target) {
    return Math.floor(target.dynamicHackingProperties.percentageToSteal / percentageStolenPerHackThread(ns, target));
}
export function growThreadsNeeded(ns, target) {
    return Math.ceil(cyclesNeededForGrowthCoefficient(ns, target) / serverGrowthPercentage(ns, target));
}
export function weakenThreadsNeeded(ns, target) {
    const playerManager = PlayerManager.getInstance(ns);
    return Math.ceil((target.dynamicHackingProperties.securityLevel - target.staticHackingProperties.minSecurityLevel) / playerManager.getWeakenPotency());
}
export function growThreadsNeededAfterTheft(ns, target) {
    return Math.ceil(cyclesNeededForGrowthCoefficientAfterTheft(ns, target) / serverGrowthPercentage(ns, target));
}
export function weakenThreadsNeededAfterTheft(ns, target) {
    const playerManager = PlayerManager.getInstance(ns);
    return Math.ceil(hackThreadsNeeded(ns, target) * CONSTANT.HACK_HARDENING / playerManager.getWeakenPotency());
}
export function weakenThreadsNeededAfterGrowth(ns, target) {
    const playerManager = PlayerManager.getInstance(ns);
    return Math.ceil(growThreadsNeededAfterTheft(ns, target) * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
}
export function weakenThreadTotalPerCycle(ns, target) {
    return (weakenThreadsNeededAfterTheft(ns, target) + weakenThreadsNeededAfterGrowth(ns, target));
}
export function computeOptimalCycles(ns, target) {
    const fullWeakenTime = ns.getWeakenTime(target.characteristics.host) * CONSTANT.MILLISECONDS_IN_SECOND - CONSTANT.QUEUE_DELAY;
    return Math.min(CONSTANT.MAX_CYCLE_NUMBER, Math.max(1, Math.floor(fullWeakenTime / CONSTANT.QUEUE_DELAY)));
}
