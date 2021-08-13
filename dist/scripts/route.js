import * as ServerAPI from '/src/api/ServerAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
async function findPath(ns, server) {
    const isInitialized = await ServerAPI.isServerMapInitialized(ns);
    if (!isInitialized)
        await ServerAPI.initializeServerMap(ns);
    const path = [server];
    let currentServer = server;
    while (currentServer.characteristics.host !== CONSTANT.HOME_SERVER_HOST) {
        const parentServerId = currentServer.characteristics.treeStructure.parent;
        currentServer = await ServerAPI.getServer(ns, parentServerId);
        path.unshift(currentServer);
    }
    return path;
}
export async function main(ns) {
    const serverName = ns.args[0];
    if (!serverName) {
        LogAPI.warn(ns, 'Please provide a server to connect with.');
        return;
    }
    const serverMap = await ServerAPI.getServerMap(ns);
    const server = serverMap.servers.find((s) => s.characteristics.host === serverName);
    if (!server) {
        LogAPI.warn(ns, 'Cannot find server ' + serverName);
        return;
    }
    const path = await findPath(ns, server);
    for (const node of path) {
        ns.connect(node.characteristics.host);
    }
}
