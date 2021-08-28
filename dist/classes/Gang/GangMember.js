import GangUpgrade from '/src/classes/Gang/GangUpgrade.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
export default class GangMember {
    constructor(ns, name) {
        this.name = name;
        this.upgrades = GangUpgrade.getMemberUpgrades(ns, this.name);
    }
    getStats(ns) {
        return ns.gang.getMemberInformation(this.name);
    }
    startTask(ns, task) {
        ns.gang.setMemberTask(this.name, task.name);
    }
    ascend(ns) {
        const results = ns.gang.ascendMember(this.name);
        if (!results)
            LogAPI.warn(ns, `Could not ascend${this.name}`);
        else {
            LogAPI.log(ns, `Ascended ${this.name}`, LogType.GANG);
            this.upgrades = this.upgrades.filter((upgrade) => upgrade.type === 'Augmentation');
        }
        return results;
    }
    purchaseUpgrade(ns, upgrade) {
        const isSuccessful = ns.gang.purchaseEquipment(this.name, upgrade.name);
        if (!isSuccessful)
            LogAPI.warn(ns, `Could not successfully purchase ${upgrade.name}`);
        else {
            this.upgrades.push(upgrade);
            LogAPI.log(ns, `Purchased ${upgrade.name} for ${this.name}`, LogType.GANG);
        }
    }
    getAscensionPoints(ns) {
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
    static calculateAscensionMultiplier(points) {
        return Math.max(Math.pow(points / 4000, 0.7), 1);
    }
    getAscensionResults(ns) {
        const currentPoints = this.getAscensionPoints(ns);
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
    static getAllGangMembers(ns) {
        const names = ns.gang.getMemberNames();
        return names.map((name) => new GangMember(ns, name));
    }
}
