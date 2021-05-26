import type { BitBurner as NS } from "Bitburner";
import HomeServer from "/src/classes/HomeServer";
import Server from "/src/classes/Server";
import { CONSTANT } from "/src/lib/constants.js";
import { ServerManager } from "/src/managers/ServerManager.js";

export async function main(ns: NS) {
    const serverManager: ServerManager = ServerManager.getInstance(ns);
    const home: HomeServer = HomeServer.getInstance();

    let serverMap: Server[] = await serverManager.getServerMap(ns);

    await Promise.all(serverMap.map(async (server) => {
        killServer(ns, server);
    }));

    ns.killall(home.host);
}

async function killServer(ns: NS, server: Server): Promise<void> {
    if (server.isHome()) return;

    let isRunningAnything: boolean = true;

    if (!isRunningAnything) return;

    ns.killall(server.host);

    do {
        isRunningAnything = (ns.ps(server.host).length > 0);

        ns.sleep(CONSTANT.KILL_ALL_SLEEP_TIME);
    } while (isRunningAnything);

    return;
}