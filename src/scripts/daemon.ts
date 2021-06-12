import type { BitBurner as NS } from "Bitburner";
import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import JobManager from "/src/managers/JobManager.js";
import PurchasedServerManager from "/src/managers/PurchasedServerManager.js";
import * as HackUtils from "/src/util/HackUtils.js";
import { Heuristics } from "/src/util/Heuristics.js";

export async function main(ns: NS) {

    const hostName: string = ns.getHostname();
    if (hostName !== "home") {
        throw new Error("Execute daemon script from home.");
    }

    await initialize(ns);

    while (true) {
        await hackLoop(ns);
    }
}

async function initialize(ns: NS) {

    ServerAPI.startServerManager(ns);

    ProgramAPI.startProgramManager(ns);

    const purchasedServerManager: PurchasedServerManager = PurchasedServerManager.getInstance(ns);
    await purchasedServerManager.start(ns);

    const jobManager: JobManager = JobManager.getInstance();
    await jobManager.startManagingLoop(ns);

    while (!isInitialized(ns)) {
        ns.tprint("waiting for inits");
        await ns.sleep(1000);
    }
}

async function hackLoop(ns: NS) {

    const jobManager: JobManager = JobManager.getInstance();

    let potentialTargets: HackableServer[] = await ServerAPI.getTargetableServers(ns);

    await ProgramAPI.rootAllServers(ns);

    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));

    potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!);

    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }

    for await (let target of potentialTargets) {

        let currentTargets: string[] = jobManager.getCurrentTargets();

        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) break;

        await HackUtils.hack(ns, target);
    }

    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}

function isInitialized(ns: NS): boolean {
    return (
        ServerAPI.isServerManagerRunning(ns) &&
        ProgramAPI.isProgramManagerRunning(ns)
    );
}