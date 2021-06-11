import { CONSTANT } from "/src/lib/constants.js";
/*
 * The player manager contains the values of the hacking multipliers and the bitnode multipliers
 */
export default class PlayerManager {
    constructor(ns) {
        this.hackingLevel = ns.getHackingLevel();
        this.hackingMultipliers = ns.getHackingMultipliers();
    }
    static getInstance(ns) {
        if (!PlayerManager.instance) {
            PlayerManager.instance = new PlayerManager(ns);
        }
        return PlayerManager.instance;
    }
    getMoney(ns) {
        return ns.getServerMoneyAvailable(CONSTANT.HOME_SERVER_HOST);
    }
    getGrowthMultiplier() {
        // TODO: Include the bitnode multiplier
        return this.hackingMultipliers.growth;
    }
    getHackMultiplier() {
        // TODO: Include the bitnode multiplier
        return this.hackingMultipliers.money;
    }
    getWeakenPotency() {
        // TODO: Include the bitnode multiplier
        return CONSTANT.WEAKEN_POTENCY;
    }
}
