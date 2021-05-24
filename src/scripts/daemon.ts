import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import { HackManager } from "/src/managers/HackManager.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import { Heuristics } from "/src/util/Heuristics.js";

export async function main(ns: NS) {

    const hostName: string = ns.getHostname();
    if (hostName !== "home") {
        throw new Error("Execute daemon script from home.");
    }

    while (true) {
        await hackLoop(ns);
    }
}

async function hackLoop(ns: NS) {

    const serverManager: ServerManager = ServerManager.getInstance(ns);
    const hackManager: HackManager = HackManager.getInstance();

    // TODO: initializeServers 
    // Purchase new servers and such to have some power later on

    // TODO: Root all servers


    let potentialTargets: HackableServer[] = await serverManager.getTargetableServers(ns);

    // Root all potential targets in advance
    // Then evaluate them afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        if (!target.isRooted) {
            target.root(ns);
        }
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));

    potentialTargets = potentialTargets.sort((a, b) => a.serverValue! - b.serverValue!);

    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }

    try {
        potentialTargets.forEach(target => hackManager.hack(ns, target));
    } catch (e) {
        // We had too many targets, so we had to stop unexpectedly
    }

    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}
