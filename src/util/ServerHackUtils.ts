import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import { PlayerManager } from "/src/managers/PlayerManager.js";
import HackUtils from "/src/util/HackUtils";

export default class ServerHackUtils {

    static serverGrowthPercentage(ns: NS, target: HackableServer): number {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        return ns.getServerGrowth(target.host) * playerManager.getGrowthMultiplier() / 100;
    }

    static adjustedGrowthRate(ns: NS, target: HackableServer): number {
        return Math.min(CONSTANT.MAX_GROWTH_RATE, 1 + ((CONSTANT.UNADJUSTED_GROWTH_RATE - 1) / target.staticHackingProperties.minSecurityLevel));
    }

    static serverGrowthRate(ns: NS, target: HackableServer): number {
        return Math.pow(this.adjustedGrowthRate(ns, target), this.serverGrowthPercentage(ns, target));
    }

    static targetGrowthCoefficient(ns: NS, target: HackableServer) {
        return target.staticHackingProperties.maxMoney / Math.max(target.dynamicHackingProperties.money, 1);
    }

    static targetGrowthCoefficientAfterTheft(ns: NS, target: HackableServer) {
        return 1 / (1 - (this.hackThreadsNeeded(ns, target) * this.percentageStolenPerHackThread(ns, target)));
    }

    static cyclesNeededForGrowthCoefficient(ns: NS, target: HackableServer) {
        return Math.log(this.targetGrowthCoefficient(ns, target)) / Math.log(this.adjustedGrowthRate(ns, target));
    }

    static cyclesNeededForGrowthCoefficientAfterTheft(ns: NS, target: HackableServer) {
        return Math.log(this.targetGrowthCoefficientAfterTheft(ns, target)) / Math.log(this.adjustedGrowthRate(ns, target));
    }

    static hackEaseCoefficient(ns: NS, target: HackableServer) {
        return (100 - Math.min(100, target.staticHackingProperties.minSecurityLevel)) / 100;
    }

    static hackingSkillCoefficient(ns: NS, target: HackableServer) {
        return (ns.getHackingLevel() - (target.staticHackingProperties.hackingLevel - 1)) / ns.getHackingLevel();
    }

    static actualHackCoefficient(ns: NS, target: HackableServer) {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        return this.hackEaseCoefficient(ns, target) * this.hackingSkillCoefficient(ns, target) * playerManager.getHackMultiplier() / 240;
    }

    static percentageStolenPerHackThread(ns: NS, target: HackableServer) {
        return Math.min(1, Math.max(0, this.actualHackCoefficient(ns, target)));
    }

    static actualPercentageToSteal(ns: NS, target: HackableServer) {
        return this.hackThreadsNeeded(ns, target) * this.percentageStolenPerHackThread(ns, target);
    }

    static hackThreadsNeeded(ns: NS, target: HackableServer) {
        return Math.floor(CONSTANT.HACK_PERCENTAGE / this.percentageStolenPerHackThread(ns, target));
    }

    static growThreadsNeeded(ns: NS, target: HackableServer) {
        return Math.ceil(this.cyclesNeededForGrowthCoefficient(ns, target) / this.serverGrowthPercentage(ns, target));
    }

    static weakenThreadsNeeded(ns: NS, target: HackableServer) {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        return Math.ceil((target.dynamicHackingProperties.securityLevel - target.staticHackingProperties.minSecurityLevel) / playerManager.getWeakenPotency());
    }

    static growThreadsNeededAfterTheft(ns: NS, target: HackableServer) {
        return Math.ceil(this.cyclesNeededForGrowthCoefficientAfterTheft(ns, target) / this.serverGrowthPercentage(ns, target));
    }

    static weakenThreadsNeededAfterTheft(ns: NS, target: HackableServer) {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);

        return Math.ceil(this.hackThreadsNeeded(ns, target) * CONSTANT.HACK_HARDENING / playerManager.getWeakenPotency());
    }

    static weakenThreadsNeededAfterGrowth(ns: NS, target: HackableServer) {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);
        return Math.ceil(this.growThreadsNeededAfterTheft(ns, target) * CONSTANT.GROW_HARDENING / playerManager.getWeakenPotency());
    }

    static weakenThreadTotalPerCycle(ns: NS, target: HackableServer) {
        return (this.weakenThreadsNeededAfterTheft(ns, target) + this.weakenThreadsNeededAfterGrowth(ns, target));
    }

    static async computeMaxCompleteCycles(ns: NS, optimalBatchCost: number) {
        return await HackUtils.computeMaxCycles(ns, optimalBatchCost, true);
    }

    static computeOptimalCycles(ns: NS, target: HackableServer) {
        const fullWeakenTime: number = ns.getWeakenTime(target.host) * CONSTANT.MILLISECONDS_IN_SECOND - CONSTANT.QUEUE_DELAY;
        return Math.min(CONSTANT.MAX_CYCLE_NUMBER, Math.max(1, Math.floor(fullWeakenTime / CONSTANT.QUEUE_DELAY)));
    }
}