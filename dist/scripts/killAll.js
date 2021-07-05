import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
export async function main(ns) {
    if (!ServerAPI.isServerManagerRunning(ns)) {
        ns.tprint("We cannot kill all processes without the ServerManager.");
        return;
    }
    // Get this first, because in a bit we won't have the server manager running anymore
    let serverMap = await ServerAPI.getServerMap(ns);
    await ControlFlowAPI.killDaemon(ns);
    await ControlFlowAPI.killAllManagers(ns);
    // Clear the queue
    ControlFlowAPI.clearPorts(ns);
    await ControlFlowAPI.killExternalServers(ns, serverMap);
    ns.killall(CONSTANT.HOME_SERVER_HOST);
    ns.exit();
}
