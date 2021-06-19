import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

export async function main(ns: NS) {
    // Get this first, because in a bit we won't have the server manager running anymore
    let serverMap: Server[] = await ServerAPI.getServerMap(ns);

    await ControlFlowAPI.killDaemon(ns);

    await ControlFlowAPI.killAllManagers(ns);

    // Clear the queue
    ControlFlowAPI.clearPort(ns);

    await ControlFlowAPI.killExternalServers(ns, serverMap);

    ns.killall(CONSTANT.HOME_SERVER_HOST);

    ns.exit();
}