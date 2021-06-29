import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

export function getPlayer(ns: NS) {
    return (ns as any).getPlayer();
}

export function getMoney(ns: NS) {
    return ns.getServerMoneyAvailable(CONSTANT.HOME_SERVER_HOST);
}

export function getGrowthMultiplier(ns: NS) {
    // TODO: Include the bitnode multiplier

    return ns.getHackingMultipliers().growth * ns.getBitNodeMultipliers().ServerGrowthRate;
}

export function getHackMultiplier(ns: NS) {
    // TODO: Include the bitnode multiplier

    return ns.getHackingMultipliers().money * ns.getBitNodeMultipliers().ScriptHackMoney;
}

export function getWeakenPotency(ns: NS) {
    // TODO: Include the bitnode multiplier
    return CONSTANT.WEAKEN_POTENCY * ns.getBitNodeMultipliers().ServerWeakenRate;
}