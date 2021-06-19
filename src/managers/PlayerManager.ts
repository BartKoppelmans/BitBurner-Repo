import type { BitBurner as NS, BitNodeMultipliers, HackingMultipliers } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

/* 
 * The player manager contains the values of the hacking multipliers and the bitnode multipliers
 */
export default class PlayerManager {
    private static instance: PlayerManager;

    hackingMultipliers: HackingMultipliers;
    bitNodeMultipliers: BitNodeMultipliers;

    private constructor(ns: NS) {
        this.hackingMultipliers = ns.getHackingMultipliers();
        this.bitNodeMultipliers = ns.getBitNodeMultipliers();
    }

    public static getInstance(ns: NS): PlayerManager {
        if (!PlayerManager.instance) {
            PlayerManager.instance = new PlayerManager(ns);
        }

        return PlayerManager.instance;
    }

    public getMoney(ns: NS) {
        return ns.getServerMoneyAvailable(CONSTANT.HOME_SERVER_HOST);
    }

    public getGrowthMultiplier() {
        // TODO: Include the bitnode multiplier

        return this.hackingMultipliers.growth * this.bitNodeMultipliers.ServerGrowthRate;
    }

    public getHackMultiplier() {
        // TODO: Include the bitnode multiplier

        return this.hackingMultipliers.money * this.bitNodeMultipliers.ScriptHackMoney;
    }

    public getWeakenPotency() {
        // TODO: Include the bitnode multiplier
        return CONSTANT.WEAKEN_POTENCY * this.bitNodeMultipliers.ServerWeakenRate;
    }
}