import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from "/src/lib/constants.js";

export async function rootAllServers(ns: NS): Promise<void> {
    // nope not yet
    return;
}

export async function startProgramManager(ns: NS): Promise<void> {
    if (isProgramManagerRunning(ns)) return;

    ns.exec('/src/managers/ProgramManager.js', ns.getHostname());

    while (!isProgramManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isProgramManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/ProgramManager.js', ns.getHostname());
}