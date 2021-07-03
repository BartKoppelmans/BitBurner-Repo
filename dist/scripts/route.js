import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
export async function main(ns) {
    const serverName = ns.args[0];
    if (!serverName) {
        ns.tprint("Please provide a server to connect with.");
        return;
    }
    if (!ServerAPI.isServerManagerRunning(ns)) {
        ns.tprint("Please launch the ServerManager first.");
        return;
    }
    // Get this first, because in a bit we won't have the server manager running anymore
    let serverMap = await ServerAPI.getServerMap(ns);
    const server = serverMap.find((server) => server.characteristics.host === serverName);
    if (!server) {
        ns.tprint("Cannot find server " + serverName);
        return;
    }
    const path = [server];
    let currentServer = server;
    while (currentServer.characteristics.host !== CONSTANT.HOME_SERVER_HOST) {
        if (!currentServer.treeStructure) {
            ns.tprint("The treestructure has not been properly created yet.");
            return;
        }
        const parentServerId = currentServer.treeStructure.parent;
        if (!parentServerId) {
            // In this case, the server can be found from the home server as well.
            break;
        }
        currentServer = await ServerAPI.getServer(ns, parentServerId);
        path.unshift(currentServer);
    }
    for (const server of path) {
        const isSuccessful = ns.connect(server.characteristics.host);
    }
}
