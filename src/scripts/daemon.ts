import type { BitBurner as NS } from "Bitburner";
import ProgramManager from "/src/managers/ProgramManager.js";
import PurchasedServerManager from "/src/managers/PurchasedServerManager.js";
import { serverManager } from "/src/managers/ServerManager.js";
import HackableServer from "/src/classes/HackableServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as HackUtils from "/src/util/HackUtils.js";
import { Heuristics } from "/src/util/Heuristics.js";
import { jobManager } from "/src/managers/JobManager.js";

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

    serverManager.rebuildServerMap(ns);

    const purchasedServerManager: PurchasedServerManager = PurchasedServerManager.getInstance(ns);
    await purchasedServerManager.start(ns);

    const programManager: ProgramManager = ProgramManager.getInstance(ns);
    await programManager.startCheckingLoop(ns);

}

async function hackLoop(ns: NS) {

    let potentialTargets: HackableServer[] = await serverManager.getTargetableServers(ns);

    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));

    potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!);

    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }

    let targetCounter: number = 0;
    for await (let target of potentialTargets) {

        const currentTargets: HackableServer[] = jobManager.getCurrentTargets();

        // Can't have too many targets at the same time
        if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) break;

        const isNewTarget: boolean = await HackUtils.hack(ns, target);

        if (isNewTarget) {
            targetCounter++;
        }
    }

    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}
