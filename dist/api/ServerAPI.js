import * as ProgramManager from "/src/managers/ProgramManager.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export async function getServerMap(ns) {
    return ServerManagerUtils.readServerMap(ns);
}
export async function requestUpdate(ns) {
    // TODO: Request the update and then wait until it is executed
}
export async function getServer(ns, id) {
    const server = (await getServerMap(ns)).find(server => server.id === id);
    if (!server)
        throw new Error("Could not find that server.");
    return server;
}
export async function getTargetableServers(ns) {
    let servers = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server));
    servers = servers
        .filter(server => server.isHackable(ns))
        .filter(server => ProgramManager.isRooted(ns, server) || ProgramManager.canRoot(ns, server))
        .filter(server => server.staticHackingProperties.maxMoney > 0);
    return servers;
}
;
// We sort this descending
export async function getHackingServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => ProgramManager.isRooted(ns, server))
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
;
// We sort this ascending
export async function getPurchasedServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}
export async function rootAllServers(ns) {
    const serverMap = await getServerMap(ns);
    // Root all servers 
    await Promise.all(serverMap.map(async (server) => {
        if (!ProgramManager.isRooted(ns, server) && ProgramManager.canRoot(ns, server)) {
            await ProgramManager.root(ns, server);
        }
    }));
}
;
export function startServerManager(ns) {
    ns.exec('/src/managers/ServerManager.js', ns.getHostname());
}
export function isServerManagerRunning(ns) {
    return ns.isRunning('/src/managers/ServerManager.js', ns.getHostname());
}
