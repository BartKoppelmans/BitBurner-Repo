import { CONSTANT } from "/src/lib/constants.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import { Heuristics } from "/src/util/Heuristics.js";
import HackUtils from "/src/util/HackUtils.js";
import PurchasedServerManager from "/src/managers/PurchasedServerManager.js";
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
    const serverManager = ServerManager.getInstance(ns);
    await serverManager.rebuildServerMap(ns);
    const purchasedServerManager = PurchasedServerManager.getInstance(ns);
    await purchasedServerManager.start(ns);
}
async function hackLoop(ns) {
    const serverManager = ServerManager.getInstance(ns);
    // NOTE: Now we just always update and that might be a lot of work?
    const serverMap = await serverManager.getServerMap(ns, true);
    // Root all servers in advance
    await Promise.all(serverMap.map(async (server) => {
        if (!server.isRooted(ns) && server.canRoot(ns)) {
            await server.root(ns);
        }
    }));
    let potentialTargets = await serverManager.getTargetableServers(ns);
    // Then evaluate the potential targets afterwards
    await Promise.all(potentialTargets.map(async (target) => {
        target.evaluate(ns, Heuristics.MainHeuristic);
    }));
    potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
    if (potentialTargets.length === 0) {
        throw new Error("No potential targets found.");
    }
    let targetCounter = 0;
    for (let target of potentialTargets) {
        // Can't have too many targets at the same time
        if (targetCounter >= CONSTANT.MAX_TARGET_COUNT)
            break;
        const isNewTarget = await HackUtils.hack(ns, target);
        if (isNewTarget) {
            targetCounter++;
        }
    }
    // Wait a second!
    await ns.sleep(CONSTANT.HACK_LOOP_DELAY);
}
