import type { BitBurner as NS } from "Bitburner";
import HomeServer from "/src/classes/HomeServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import ServerManager from "/src/managers/ServerManager.js";
import ServerUtils from "/src/util/ServerUtils.js";

export async function main(ns: NS) {
    const serverManager: ServerManager = ServerManager.getInstance(ns);
    const home: HomeServer = HomeServer.getInstance(ns);

    let serverMap: Server[] = await serverManager.getServerMap(ns);

    await Promise.all(serverMap.map(async (server) => {
        killServer(ns, server);
    }));

    ns.killall(home.host);
}

async function killServer(ns: NS, server: Server): Promise<void> {
    if (ServerUtils.isHomeServer(server)) return;

    let isRunningAnything: boolean = true;

    if (!isRunningAnything) return;

    ns.killall(server.host);

    do {
        isRunningAnything = (ns.ps(server.host).length > 0);

        ns.sleep(CONSTANT.SMALL_DELAY);
    } while (isRunningAnything);

    return;
}