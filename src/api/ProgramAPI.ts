import type { BitBurner as NS } from "Bitburner";

export async function rootAllServers(ns: NS): Promise<void> {
    // nope not yet
    return;
}

export function startProgramManager(ns: NS): void {
    ns.exec('/src/managers/ProgramManager.js', ns.getHostname());
}

export function isProgramManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/ProgramManager.js', ns.getHostname());
}