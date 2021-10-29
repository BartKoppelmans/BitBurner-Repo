import GangTask from '/src/classes/Gang/GangTask.js';
import GangUpgrade from '/src/classes/Gang/GangUpgrade.js';
import * as LogAPI from '/src/api/LogAPI.js';
export default class GangMember {
    name;
    upgrades;
    constructor(ns, name) {
        this.name = name;
        this.upgrades = GangUpgrade.getMemberUpgrades(ns, this.name);
    }
    static getAllGangMembers(ns) {
        const names = ns.gang.getMemberNames();
        return names.map((name) => new GangMember(ns, name));
    }
    static calculateAscensionMultiplier(points) {
        return Math.max(Math.pow(points / 4000, 0.7), 1);
    }
    getCurrentTask(ns) {
        const taskName = this.getGangMemberInformation(ns).task;
        return GangTask.getTask(ns, taskName);
    }
    getGangMemberInformation(ns) {
        return ns.gang.getMemberInformation(this.name);
    }
    getGangMemberStats(ns) {
        const gangMemberInformation = this.getGangMemberInformation(ns);
        return {
            hack: gangMemberInformation.hack,
            str: gangMemberInformation.str,
            def: gangMemberInformation.def,
            dex: gangMemberInformation.dex,
            agi: gangMemberInformation.agi,
            cha: gangMemberInformation.cha,
        };
    }
    startTask(ns, task) {
        const currentTask = this.getCurrentTask(ns);
        if (currentTask.name !== task.name) {
            ns.gang.setMemberTask(this.name, task.name);
            if (task.name !== 'Unassigned')
                LogAPI.printLog(ns, `Gang member '${this.name}' is starting task '${task.name}'`);
        }
    }
    ascend(ns) {
        const results = ns.gang.ascendMember(this.name);
        if (!results)
            LogAPI.printTerminal(ns, `Could not ascend${this.name}`);
        else {
            LogAPI.printLog(ns, `Ascended ${this.name}`);
            this.upgrades = this.upgrades.filter((upgrade) => upgrade.type === 'Augmentation');
        }
        return results;
    }
    purchaseUpgrade(ns, upgrade) {
        const isSuccessful = ns.gang.purchaseEquipment(this.name, upgrade.name);
        if (isSuccessful)
            this.upgrades.push(upgrade);
        return isSuccessful;
    }
    getCurrentAscensionPoints(ns) {
        const memberInformation = ns.gang.getMemberInformation(this.name);
        return {
            hack: memberInformation.hack_asc_points,
            str: memberInformation.str_asc_points,
            def: memberInformation.def_asc_points,
            dex: memberInformation.dex_asc_points,
            agi: memberInformation.agi_asc_points,
            cha: memberInformation.cha_asc_points,
        };
    }
    getAscensionResults(ns) {
        const currentPoints = this.getCurrentAscensionPoints(ns);
        const newPoints = this.getNewAscensionPoints(ns);
        return {
            hack: GangMember.calculateAscensionMultiplier(currentPoints.hack + newPoints.hack) / GangMember.calculateAscensionMultiplier(currentPoints.hack),
            str: GangMember.calculateAscensionMultiplier(currentPoints.str + newPoints.str) / GangMember.calculateAscensionMultiplier(currentPoints.str),
            def: GangMember.calculateAscensionMultiplier(currentPoints.def + newPoints.def) / GangMember.calculateAscensionMultiplier(currentPoints.def),
            dex: GangMember.calculateAscensionMultiplier(currentPoints.dex + newPoints.dex) / GangMember.calculateAscensionMultiplier(currentPoints.dex),
            agi: GangMember.calculateAscensionMultiplier(currentPoints.agi + newPoints.agi) / GangMember.calculateAscensionMultiplier(currentPoints.agi),
            cha: GangMember.calculateAscensionMultiplier(currentPoints.cha + newPoints.cha) / GangMember.calculateAscensionMultiplier(currentPoints.cha),
        };
    }
    getNewAscensionPoints(ns) {
        const memberInformation = ns.gang.getMemberInformation(this.name);
        return {
            hack: Math.max(memberInformation.hack_exp - 1000, 0),
            str: Math.max(memberInformation.str_exp - 1000, 0),
            def: Math.max(memberInformation.def_exp - 1000, 0),
            dex: Math.max(memberInformation.dex_exp - 1000, 0),
            agi: Math.max(memberInformation.agi_exp - 1000, 0),
            cha: Math.max(memberInformation.cha_exp - 1000, 0),
        };
    }
}
