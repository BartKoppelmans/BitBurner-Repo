import * as GangUtils from '/src/util/GangUtils.js';
import HomeGang from '/src/classes/Gang/HomeGang.js';
export default class GangTask {
    constructor(ns, name) {
        this.name = name;
    }
    static getTask(ns, taskName) {
        return new GangTask(ns, taskName);
    }
    static getAllTasks(ns) {
        const taskNames = ns.gang.getTaskNames();
        return taskNames.map((name) => new GangTask(ns, name));
    }
    static getTrainTask(ns) {
        if (GangUtils.isHackingGang(ns))
            return GangTask.getTask(ns, 'Train Hacking');
        else
            return GangTask.getTask(ns, 'Train Combat');
    }
    static getRespectTask(ns, member) {
        let optimalGain = { task: this.getUnassignedTask(ns), gain: 0 };
        for (const task of this.getAllTasks(ns)) {
            const gain = this.calculateRespectGain(ns, task, member);
            if (gain > optimalGain.gain)
                optimalGain = { task, gain };
        }
        return optimalGain.task;
    }
    static getWantedLevelReductionTask(ns, member) {
        let optimalGain = { task: this.getUnassignedTask(ns), gain: 0 };
        for (const task of this.getAllTasks(ns)) {
            const gain = this.calculateWantedLevelGain(ns, task, member);
            if (gain < optimalGain.gain)
                optimalGain = { task, gain };
        }
        return optimalGain.task;
    }
    static getMoneyTask(ns, member) {
        let optimalGain = { task: this.getUnassignedTask(ns), gain: 0 };
        for (const task of this.getAllTasks(ns)) {
            const gain = this.calculateMoneyGain(ns, task, member);
            if (gain > optimalGain.gain)
                optimalGain = { task, gain };
        }
        return optimalGain.task;
    }
    static getTerritoryWarfareTask(ns) {
        return GangTask.getTask(ns, 'Territory Warfare');
    }
    static getUnassignedTask(ns) {
        return GangTask.getTask(ns, 'Unassigned');
    }
    static calculateRespectGain(ns, task, member) {
        const taskStats = task.getTaskStats(ns);
        const memberStats = member.getGangMemberStats(ns);
        const gangInformation = ns.gang.getGangInformation();
        if (taskStats.baseRespect === 0)
            return 0;
        let statWeight = (taskStats.hackWeight / 100) * memberStats.hack +
            (taskStats.strWeight / 100) * memberStats.str +
            (taskStats.defWeight / 100) * memberStats.def +
            (taskStats.dexWeight / 100) * memberStats.dex +
            (taskStats.agiWeight / 100) * memberStats.agi +
            (taskStats.chaWeight / 100) * memberStats.cha;
        statWeight -= (4 * taskStats.difficulty);
        if (statWeight <= 0)
            return 0;
        const territoryMultiplier = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.respect) / 100);
        if (isNaN(territoryMultiplier) || territoryMultiplier <= 0)
            return 0;
        const respectMultiplier = HomeGang.calculateWantedPenalty(ns, gangInformation);
        return 11 * taskStats.baseRespect * statWeight * territoryMultiplier * respectMultiplier;
    }
    static calculateMoneyGain(ns, task, member) {
        const taskStats = task.getTaskStats(ns);
        const memberStats = member.getGangMemberStats(ns);
        const gangInformation = ns.gang.getGangInformation();
        if (taskStats.baseMoney === 0)
            return 0;
        let statWeight = (taskStats.hackWeight / 100) * memberStats.hack +
            (taskStats.strWeight / 100) * memberStats.str +
            (taskStats.defWeight / 100) * memberStats.def +
            (taskStats.dexWeight / 100) * memberStats.dex +
            (taskStats.agiWeight / 100) * memberStats.agi +
            (taskStats.chaWeight / 100) * memberStats.cha;
        statWeight -= (3.2 * taskStats.difficulty);
        if (statWeight <= 0)
            return 0;
        const territoryMultiplier = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.money) / 100);
        if (isNaN(territoryMultiplier) || territoryMultiplier <= 0)
            return 0;
        const respectMultiplier = HomeGang.calculateWantedPenalty(ns, gangInformation);
        return 5 * taskStats.baseMoney * statWeight * territoryMultiplier * respectMultiplier;
    }
    static calculateWantedLevelGain(ns, task, member) {
        const taskStats = task.getTaskStats(ns);
        const memberStats = member.getGangMemberStats(ns);
        const gangInformation = ns.gang.getGangInformation();
        if (taskStats.baseWanted === 0)
            return 0;
        let statWeight = (taskStats.hackWeight / 100) * memberStats.hack +
            (taskStats.strWeight / 100) * memberStats.str +
            (taskStats.defWeight / 100) * memberStats.def +
            (taskStats.dexWeight / 100) * memberStats.dex +
            (taskStats.agiWeight / 100) * memberStats.agi +
            (taskStats.chaWeight / 100) * memberStats.cha;
        statWeight -= (3.5 * taskStats.difficulty);
        if (statWeight <= 0)
            return 0;
        const territoryMultiplier = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.wanted) / 100);
        if (isNaN(territoryMultiplier) || territoryMultiplier <= 0)
            return 0;
        if (taskStats.baseWanted < 0) {
            return 0.4 * taskStats.baseWanted * statWeight * territoryMultiplier;
        }
        const calc = 7 * taskStats.baseWanted / (Math.pow(3 * statWeight * territoryMultiplier, 0.8));
        // Put an arbitrary cap on this to prevent wanted level from rising too fast if the
        // denominator is very small. Might want to rethink formula later
        return Math.min(100, calc);
    }
    getTaskStats(ns) {
        return ns.gang.getTaskStats(this.name);
    }
}
