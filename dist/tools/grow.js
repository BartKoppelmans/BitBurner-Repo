import { JobManager } from "/src/managers/JobManager.js";
export async function main(ns) {
    const hackManager = JobManager.getInstance();
    const target = ns.args[0];
    const start = parseInt(ns.args[1]);
    const id = parseInt(ns.args[2]);
    const wait = start - Date.now();
    await ns.sleep(wait);
    await ns.grow(target);
    hackManager.finishJob(ns, id);
}
