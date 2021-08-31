import * as GangUtils from '/src/util/GangUtils.js';
export default class GangTask {
    constructor(ns, name) {
        this.name = name;
    }
    static getTask(ns, taskName) {
        return new GangTask(ns, taskName);
    }
    static getTrainTask(ns) {
        if (GangUtils.isHackingGang(ns))
            return GangTask.getTask(ns, 'Train Hacking');
        else
            return GangTask.getTask(ns, 'Train Combat');
    }
    static getRespectTask(ns, member) {
        // TODO: Make this actually calculate what would be best
        if (GangUtils.isHackingGang(ns))
            return GangTask.getTask(ns, 'Cyberterrorism');
        else
            return GangTask.getTask(ns, 'Terrorism');
    }
    static getWantedLevelReductionTask(ns) {
        return GangTask.getTask(ns, 'Vigilante Justice');
    }
    static getMoneyTask(ns) {
        return GangTask.getTask(ns, 'Traffick Illegal Arms');
    }
    static getTerritoryWarfareTask(ns) {
        return GangTask.getTask(ns, 'Territory Warfare');
    }
    static getUnassignedTask(ns) {
        return GangTask.getTask(ns, 'Unassigned');
    }
}
