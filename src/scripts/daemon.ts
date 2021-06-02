import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import { Heuristics } from "/src/util/Heuristics.js";
import HackUtils from "/src/util/HackUtils.js";

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
    const serverMap: Server[] = await serverManager.getServerMap(ns, true); // TODO: Now we just always update and that might be a lot of work?

    // TODO: initializeServers 
    // Purchase new servers and such to have some power later on

    // Root all servers in advance
    await Promise.all(serverMap.map(async (server) => {
        if (!server.isRooted(ns) && server.canRoot(ns)) {
            await server.root(ns);
        }
    }));

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
    for (let target of potentialTargets) {
        // Can't have too many targets at the same time
        if (targetCounter >= CONSTANT.MAX_TARGET_COUNT) break;

        const isNewTarget: boolean = await HackUtils.hack(ns, target);

        if (isNewTarget) {
            targetCounter++;
        }
    }

    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}
