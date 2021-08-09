import * as ServerAPI from '/src/api/ServerAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
async function findPath(ns, server) {
    const isInitialized = await ServerAPI.isServerMapInitialized(ns);
    if (!isInitialized)
        await ServerAPI.initializeServerMap(ns);
    const path = [server];
    let currentServer = server;
    while (currentServer.characteristics.host !== CONSTANT.HOME_SERVER_HOST) {
        if (!currentServer.treeStructure) {
            throw new Error('The tree structure was not correctly created');
        }
        const parentServerId = currentServer.treeStructure.parent;
        if (!parentServerId) {
            // In this case, the server can be found from the home server as well.
            break;
        }
        currentServer = await ServerAPI.getServer(ns, parentServerId);
        path.unshift(currentServer);
    }
    return path;
}
export async function main(ns) {
    const serverName = ns.args[0];
    if (!serverName) {
        ns.tprint('Please provide a server to connect with.');
        return;
    }
    const serverMap = await ServerAPI.getServerMap(ns);
    const server = serverMap.servers.find((s) => s.characteristics.host === serverName);
    if (!server) {
        ns.tprint('Cannot find server ' + serverName);
        return;
    }
    const path = await findPath(ns, server);
    for (const node of path) {
        const isSuccessful = ns.connect(node.characteristics.host);
    }
}
