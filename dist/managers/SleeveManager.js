import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import Sleeve from '/src/classes/Sleeve/Sleeve.js';
import { SleeveTrainStat } from '/src/classes/Sleeve/SleeveInterfaces.js';
const LOOP_DELAY = 10000;
const STAT_MUG_THRESHOLD = 25;
const STAT_HOMICIDE_THRESHOLD = 100;
class SleeveManager {
    static shouldTrain(ns, stats) {
        if (stats.strength < STAT_MUG_THRESHOLD)
            return SleeveTrainStat.STRENGTH;
        else if (stats.defense < STAT_MUG_THRESHOLD)
            return SleeveTrainStat.DEFENSE;
        else if (stats.dexterity < STAT_MUG_THRESHOLD)
            return SleeveTrainStat.DEXTERITY;
        else if (stats.agility < STAT_MUG_THRESHOLD)
            return SleeveTrainStat.AGILITY;
        else
            return SleeveTrainStat.NONE;
    }
    static shouldMug(ns, stats) {
        return stats.strength < STAT_HOMICIDE_THRESHOLD ||
            stats.defense < STAT_HOMICIDE_THRESHOLD ||
            stats.dexterity < STAT_HOMICIDE_THRESHOLD ||
            stats.agility < STAT_HOMICIDE_THRESHOLD;
    }
    static manageSleeve(ns, sleeve) {
        const information = sleeve.getInformation(ns);
        const stats = sleeve.getStats(ns);
        if (stats.shock > 0) {
            return sleeve.recoverShock(ns);
            // TODO: Check whether mugging works better?
        }
        if (stats.sync < 100) {
            return sleeve.synchronize(ns);
        }
        // TODO: Buy augments if possible
        const trainStat = SleeveManager.shouldTrain(ns, stats);
        if (trainStat !== SleeveTrainStat.NONE) {
            return sleeve.setToTrain(ns, trainStat);
        }
        if (SleeveManager.shouldMug(ns, stats)) {
            return sleeve.commitCrime(ns, 'mug');
        }
        return sleeve.commitCrime(ns, 'homicide');
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the SleeveManager`);
    }
    async destroy(ns) {
        LogAPI.printTerminal(ns, `Stopping the SleeveManager`);
    }
    async managingLoop(ns) {
        const sleeves = Sleeve.getSleeves(ns);
        for (const sleeve of sleeves) {
            SleeveManager.manageSleeve(ns, sleeve);
        }
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new SleeveManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await instance.managingLoop(ns);
        await ns.asleep(LOOP_DELAY);
    }
}
