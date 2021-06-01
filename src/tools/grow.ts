// the purpose of hack-target is to wait until an appointed time and then execute a hack.
import type { BitBurner as NS } from "Bitburner";
import { JobManager } from "src/managers/JobManager.js";

export async function main(ns: NS) {

    const hackManager: JobManager = JobManager.getInstance();

    const target: string = ns.args[0];
    const start: number = parseInt(ns.args[1]);
    const id: number = parseInt(ns.args[2]);

    const wait: number = start - Date.now();

    await ns.sleep(wait);
    await ns.grow(target);

    hackManager.finishJob(ns, id);

}