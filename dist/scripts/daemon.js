import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
import JobManager from "/src/managers/JobManager.js";
import PurchasedServerManager from "/src/managers/PurchasedServerManager.js";
import * as HackUtils from "/src/util/HackUtils.js";
import { Heuristics } from "/src/util/Heuristics.js";
export async function main(ns) {
    const hostName = ns.getHostname();
    if (hostName !== "home") {
        throw new Error("Execute daemon script from home.");
    }
    await initialize(ns);
    while (true) {
        await hackLoop(ns);
    }
}
async function initialize(ns) {
    ServerAPI.startServerManager(ns);
    ProgramAPI.startProgramManager(ns);
    const purchasedServerManager = PurchasedServerManager.getInstance(ns);
    await purchasedServerManager.start(ns);
    const jobManager = JobManager.getInstance();
    await jobManager.startManagingLoop(ns);
    while (!isInitialized(ns)) {
        ns.tprint("waiting for inits");
        await ns.sleep(1000);
    }
}
async function hackLoop(ns) {
    const jobManager = JobManager.getInstance();
    let potentialTargets = await ServerAPI.getTargetableServers(ns);
    await ProgramAPI.rootAllServers(ns);
    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));
    potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }
    for await (let target of potentialTargets) {
        let currentTargets = jobManager.getCurrentTargets();
        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT)
            break;
        await HackUtils.hack(ns, target);
    }
    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}
function isInitialized(ns) {
    return (ServerAPI.isServerManagerRunning(ns) &&
        ProgramAPI.isProgramManagerRunning(ns));
}
