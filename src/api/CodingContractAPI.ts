import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

export async function startCodingContractManager(ns: NS): Promise<void> {
    if (isCodingContractManagerRunning(ns)) return;

    // TODO: Check whether there is enough ram available

    ns.exec('/src/managers/CodingContractManager.js', CONSTANT.HOME_SERVER_HOST);

    while (!isCodingContractManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isCodingContractManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/CodingContractManager.js', CONSTANT.HOME_SERVER_HOST);
}