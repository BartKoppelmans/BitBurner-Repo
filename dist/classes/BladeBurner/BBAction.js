import { CONSTANT } from '/src/lib/constants.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import { BBCity } from '/src/classes/BladeBurner/BBCity.js';
export const CHANCE_THRESHOLD = 0.90;
export const ACTION_SLACK = 500;
export default class BBAction {
    constructor(ns, name, type) {
        this.name = name;
        this.type = type;
    }
    getCount(ns) {
        return ns.bladeburner.getActionCountRemaining(this.type, this.name);
    }
    getReputationGain(ns) {
        return ns.bladeburner.getActionRepGain(this.type, this.name);
    }
    getDuration(ns) {
        const time = ns.bladeburner.getActionTime(this.type, this.name); // In seconds
        const bonusTime = ns.bladeburner.getBonusTime(); // In Seconds
        let actualTime;
        if (bonusTime === 0)
            actualTime = time;
        else if (bonusTime > time)
            actualTime = Math.ceil(time / 5);
        else
            actualTime = Math.ceil(bonusTime / 5) + (time - bonusTime);
        return actualTime * CONSTANT.MILLISECONDS_IN_SECOND + ACTION_SLACK;
    }
    getChance(ns) {
        const [lower, upper] = ns.bladeburner.getActionEstimatedSuccessChance(this.type, this.name);
        return { lower, upper };
    }
    isAchievable(ns) {
        if (this.type === 'black ops') {
            if (ns.bladeburner.getRank() < ns.bladeburner.getBlackOpRank(this.name)) {
                return false;
            }
        }
        if (this.name === 'Raid') {
            const currentCity = new BBCity(ns, ns.bladeburner.getCity());
            if (currentCity.getCommunities(ns) === 0)
                return false;
        }
        return this.getChance(ns).lower > CHANCE_THRESHOLD;
    }
    getBlackOpRank(ns) {
        if (this.type !== 'black ops')
            throw new Error('Cannot get the BlackOps rank for other actions');
        return ns.bladeburner.getBlackOpRank(this.name);
    }
    async continue(ns, iteration) {
        // TODO: Decide whether we want to log continuing actions
        LogAPI.log(ns, `${ns.nFormat(iteration, '000000')} - Executing ${this.type} action '${this.name}'`, LogType.BLADEBURNER);
        await ns.sleep(this.getDuration(ns));
    }
    async execute(ns, iteration) {
        ns.bladeburner.startAction(this.type, this.name);
        LogAPI.log(ns, `${ns.nFormat(iteration, '000000')} - Executing ${this.type} action '${this.name}'`, LogType.BLADEBURNER);
        await ns.sleep(this.getDuration(ns));
    }
}
