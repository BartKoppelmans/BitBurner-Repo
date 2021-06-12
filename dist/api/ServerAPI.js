import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export async function getServerMap(ns) {
    return ServerManagerUtils.readServerMap(ns);
}
export async function requestUpdate(ns) {
    // TODO: Request the update and then wait until it is executed
    return;
}
export async function getServer(ns, id) {
    const server = (await getServerMap(ns)).find(server => server.id === id);
    if (!server)
        throw new Error("Could not find that server.");
    return server;
}
export async function getTargetServers(ns) {
    let servers = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server));
    servers = servers
        .filter(server => server.isHackable(ns))
        .filter(server => server.isRooted(ns))
        .filter(server => server.staticHackingProperties.maxMoney > 0);
    return servers;
}
;
// We sort this descending
export async function getHackingServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => server.isRooted(ns))
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
;
// We sort this ascending
export async function getPurchasedServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}
export function startServerManager(ns) {
    ns.exec('/src/managers/ServerManager.js', ns.getHostname());
}
export function isServerManagerRunning(ns) {
    return ns.isRunning('/src/managers/ServerManager.js', ns.getHostname());
}
