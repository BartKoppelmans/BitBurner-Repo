import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";

export async function main(ns: NS) {
    let serverMap: Server[] = await ServerAPI.getServerMap(ns);

    await Promise.all(serverMap.map(async (server) => {
        killServer(ns, server);
    }));

    ns.killall(CONSTANT.HOME_SERVER_HOST);
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