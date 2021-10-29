import * as LogAPI from '/src/api/LogAPI.js';
import { SleeveTrainStat, } from '/src/classes/Sleeve/SleeveInterfaces.js';
export default class Sleeve {
    id;
    constructor(ns, id) {
        this.id = id;
    }
    static getSleeves(ns) {
        const numSleeves = ns.sleeve.getNumSleeves();
        const sleeves = [];
        for (let i = 0; i < numSleeves; i++) {
            sleeves.push(new Sleeve(ns, i));
        }
        return sleeves;
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
        LogAPI.printLog(ns, `Set sleeve ${this.id} to synchronize`);
    }
    setToTrain(ns, stat) {
        if (stat === SleeveTrainStat.NONE)
            return;
        const task = this.getTask(ns);
        if (task.gymStatType === stat) {
            return;
        }
        ns.sleeve.setToGymWorkout(this.id, 'Powerhouse Gym', stat);
        LogAPI.printLog(ns, `Set sleeve ${this.id} to train ${stat}`);
    }
    recoverShock(ns) {
        const task = this.getTask(ns);
        if (task.task === 'Recovery') {
            return;
        }
        ns.sleeve.setToShockRecovery(this.id);
        LogAPI.printLog(ns, `Set sleeve ${this.id} to recover from shock`);
    }
    commitCrime(ns, crime) {
        const task = this.getTask(ns);
        if (task.task === 'Crime' && task.crime === crime) {
            return;
        }
        const isSuccessful = ns.sleeve.setToCommitCrime(this.id, crime);
        if (isSuccessful)
            LogAPI.printLog(ns, `Set sleeve ${this.id} to commit crime '${crime}'`);
        else
            LogAPI.printLog(ns, `Failed to set sleeve ${this.id} to commit crime '${crime}'`);
    }
}
