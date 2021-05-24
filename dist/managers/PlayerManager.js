import { CONSTANT } from "/src/lib/constants";
/*
 * The player manager contains the values of the hacking multipliers and the bitnode multipliers
 */
export class PlayerManager {
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
    getGrowthMultiplier() {
        // TODO: Include the bitnode multiplier
        return this.hackingMultipliers.growth;
    }
    getWeakenPotency() {
        // TODO: Include the bitnode multiplier
        return CONSTANT.WEAKEN_POTENCY;
    }
}
