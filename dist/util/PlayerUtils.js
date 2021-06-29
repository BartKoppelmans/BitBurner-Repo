import { CONSTANT } from "/src/lib/constants.js";
export function getPlayer(ns) {
    return ns.getPlayer();
}
export function getMoney(ns) {
    return ns.getServerMoneyAvailable(CONSTANT.HOME_SERVER_HOST);
}
export function getGrowthMultiplier(ns) {
    // TODO: Include the bitnode multiplier
    return ns.getHackingMultipliers().growth * ns.getBitNodeMultipliers().ServerGrowthRate;
}
export function getHackMultiplier(ns) {
    // TODO: Include the bitnode multiplier
    return ns.getHackingMultipliers().money * ns.getBitNodeMultipliers().ScriptHackMoney;
}
export function getWeakenPotency(ns) {
    // TODO: Include the bitnode multiplier
    return CONSTANT.WEAKEN_POTENCY * ns.getBitNodeMultipliers().ServerWeakenRate;
}
