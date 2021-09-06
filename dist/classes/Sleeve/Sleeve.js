import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
export default class Sleeve {
    constructor(ns, id) {
        this.id = id;
    }
    getInformation(ns) {
        return ns.sleeve.getInformation(this.id);
    }
    getStats(ns) {
        return ns.sleeve.getSleeveStats(this.id);
    }
    getTask(ns) {
        return ns.sleeve.getTask(this.id);
    }
    synchronize(ns) {
        const task = this.getTask(ns);
        if (task.task === 'Synchro') {
            return;
        }
        ns.sleeve.setToSynchronize(this.id);
        LogAPI.log(ns, `Set sleeve ${this.id} to synchronize`, LogType.SLEEVE);
    }
    recoverShock(ns) {
        const task = this.getTask(ns);
        if (task.task === 'Recovery') {
            return;
        }
        ns.sleeve.setToShockRecovery(this.id);
        LogAPI.log(ns, `Set sleeve ${this.id} to recover from shock`, LogType.SLEEVE);
    }
    commitCrime(ns, crime) {
        const task = this.getTask(ns);
        if (task.task === 'Crime' && task.crime === crime) {
            return;
        }
        ns.sleeve.setToCommitCrime(this.id, crime);
        LogAPI.log(ns, `Set sleeve ${this.id} to commit crime '${crime}'`, LogType.SLEEVE);
    }
    static getSleeves(ns) {
        const numSleeves = ns.sleeve.getNumSleeves();
        const sleeves = [];
        for (let i = 0; i < numSleeves; i++) {
            sleeves.push(new Sleeve(ns, i));
        }
        return sleeves;
    }
}
