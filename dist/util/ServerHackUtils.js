import { CONSTANT } from "/src/lib/constants.js";
import PlayerManager from "/src/managers/PlayerManager.js";
export default class ServerHackUtils {
    static serverGrowthPercentage(ns, target) {
        const playerManager = PlayerManager.getInstance(ns);
        return ns.getServerGrowth(target.host) * playerManager.getGrowthMultiplier() / 100;
    }
    static adjustedGrowthRate(ns, target) {
        return Math.min(CONSTANT.MAX_GROWTH_RATE, 1 + ((CONSTANT.UNADJUSTED_GROWTH_RATE - 1) / target.staticHackingProperties.minSecurityLevel));
    }
    static serverGrowthRate(ns, target) {
        return Math.pow(this.adjustedGrowthRate(ns, target), this.serverGrowthPercentage(ns, target));
    }
    static targetGrowthCoefficient(ns, target) {
        return target.staticHackingProperties.maxMoney / Math.max(target.dynamicHackingProperties.money, 1);
    }
    static targetGrowthCoefficientAfterTheft(ns, target) {
        return 1 / (1 - (this.hackThreadsNeeded(ns, target) * this.percentageStolenPerHackThread(ns, target)));
    }
    static cyclesNeededForGrowthCoefficient(ns, target) {
        return Math.log(this.targetGrowthCoefficient(ns, target)) / Math.log(this.adjustedGrowthRate(ns, target));
    }
    static cyclesNeededForGrowthCoefficientAfterTheft(ns, target) {
        return Math.log(this.targetGrowthCoefficientAfterTheft(ns, target)) / Math.log(this.adjustedGrowthRate(ns, target));
    }
    static hackEaseCoefficient(ns, target) {
        return (100 - Math.min(100, target.staticHackingProperties.minSecurityLevel)) / 100;
    }
    static hackingSkillCoefficient(ns, target) {
        return (ns.getHackingLevel() - (target.staticHackingProperties.hackingLevel - 1)) / ns.getHackingLevel();
    }
    static actualHackCoefficient(ns, target) {
        const playerManager = PlayerManager.getInstance(ns);
        return this.hackEaseCoefficient(ns, target) * this.hackingSkillCoefficient(ns, target) * playerManager.getHackMultiplier() / 240;
    }
    static percentageStolenPerHackThread(ns, target) {
        return Math.min(1, Math.max(0, this.actualHackCoefficient(ns, target)));
    }
    static actualPercentageToSteal(ns, target) {
        return this.hackThreadsNeeded(ns, target) * this.percentageStolenPerHackThread(ns, target);
    }
    static hackThreadsNeeded(ns, target) {
        return Math.floor(CONSTANT.HACK_PERCENTAGE / this.percentageStolenPerHackThread(ns, target));
    }
    static growThreadsNeeded(ns, target) {
        return Math.ceil(this.cyclesNeededForGrowthCoefficient(ns, target) / this.serverGrowthPercentage(ns, target));
    }
    static weakenThreadsNeeded(ns, target) {
        const playerManager = PlayerManager.getInstance(ns);
        return Math.ceil((target.dynamicHackingProperties.securityLevel - target.staticHackingProperties.minSecurityLevel) / playerManager.getWeakenPotency());
    }
    static growThreadsNeededAfterTheft(ns, target) {
        return Math.ceil(this.cyclesNeededForGrowthCoefficientAfterTheft(ns, target) / this.serverGrowthPercentage(ns, target));
    }
    static weakenThreadsNeededAfterTheft(ns, target) {
        const playerManager = PlayerManager.getInstance(ns);
        return Math.ceil(this.hackThreadsNeeded(ns, target) * CONSTANT.HACK_HARDENING / playerManager.getWeakenPotency());
    }
    static weakenThreadsNeededAfterGrowth(ns, target) {
        const playerManager = PlayerManager.getInstance(ns);
        return Math.ceil(this.growThreadsNeededAfterTheft(ns, target) * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
    }
    static weakenThreadTotalPerCycle(ns, target) {
        return (this.weakenThreadsNeededAfterTheft(ns, target) + this.weakenThreadsNeededAfterGrowth(ns, target));
    }
    static computeOptimalCycles(ns, target) {
        const fullWeakenTime = ns.getWeakenTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND - CONSTANT.QUEUE_DELAY;
        return Math.min(CONSTANT.MAX_CYCLE_NUMBER, Math.max(1, Math.floor(fullWeakenTime / CONSTANT.QUEUE_DELAY)));
    }
}
