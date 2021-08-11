import { ServerPurpose, ServerStatus, } from '/src/interfaces/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as SerializationUtils from '/src/util/SerializationUtils.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogMessageCode } from '/src/interfaces/PortMessageInterfaces.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
export async function getServerMap(ns) {
    return await readServerMap(ns);
}
async function readServerMap(ns) {
    // TODO: Build in more robustness checks here
    const serverMapString = ns.read(CONSTANT.SERVER_MAP_FILENAME).toString();
    const serverMap = JSON.parse(serverMapString);
    serverMap.lastUpdated = new Date(serverMap.lastUpdated);
    const serverObjects = Array.from(serverMap.servers);
    serverMap.servers = [];
    for (const server of serverObjects) {
        serverMap.servers.push(SerializationUtils.serverFromJSON(ns, server));
    }
    return serverMap;
}
export async function clearServerMap(ns) {
    ns.clear(CONSTANT.SERVER_MAP_FILENAME);
}
export async function writeServerMap(ns, serverMap) {
    // NOTE: Do we want to do this?
    serverMap.lastUpdated = new Date();
    ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w');
}
export async function updateServer(ns, server) {
    const serverMap = await getServerMap(ns);
    const index = serverMap.servers.findIndex((s) => s.characteristics.host === server.characteristics.host);
    if (index === -1)
        throw new Error('Could not find the server.');
    serverMap.servers[index] = server;
    await writeServerMap(ns, serverMap);
}
export async function setPurpose(ns, server, purpose) {
    server.purpose = purpose;
    await updateServer(ns, server);
}
export async function setStatus(ns, server, status) {
    if (!ServerUtils.isHackableServer(server))
        throw new Error('The server is not a hackable server');
    server.status = status;
    await updateServer(ns, server);
}
export async function addServer(ns, server) {
    const serverMap = await getServerMap(ns);
    const serverAlreadyExists = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host);
    if (serverAlreadyExists)
        throw new Error('Cannot add a server that already exists in the list');
    serverMap.servers.push(server);
    await writeServerMap(ns, serverMap);
}
export async function quarantine(ns, server, ram) {
    server.purpose = ServerPurpose.NONE;
    server.quarantinedInformation = { quarantined: true, ram };
    await updateServer(ns, server);
    await LogAPI.log(ns, `We put ${server.characteristics.host} into quarantine`, true, LogMessageCode.PURCHASED_SERVER);
}
export async function upgradeServer(ns, server, ram) {
    // TODO: Do some checks here
    if (!server.canUpgrade(ns, ram))
        throw new Error('Cannot upgrade the server.');
    // TODO: Perhaps we should check here again how much we can actually purchase
    const deletedServer = ns.deleteServer(server.characteristics.host);
    if (!deletedServer)
        throw new Error(`Could not delete server ${server.characteristics.host}`);
    const boughtServer = ns.purchaseServer(server.characteristics.host, ram);
    if (boughtServer) {
        await LogAPI.log(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`, true, LogMessageCode.PURCHASED_SERVER);
    }
    else
        throw new Error('Could not purchase the server again.');
    server.purpose = PurchasedServer.determinePurpose(server.characteristics.purchasedServerId);
    server.quarantinedInformation = { quarantined: false };
    await updateServer(ns, server);
}
export async function increaseReservation(ns, server, reservation) {
    server.increaseReservation(ns, +reservation.toFixed(2));
    await updateServer(ns, server);
}
export async function decreaseReservation(ns, server, reservation) {
    server.decreaseReservation(ns, +reservation.toFixed(2));
    await updateServer(ns, server);
}
export async function getServer(ns, id) {
    const server = (await getServerMap(ns)).servers.find(s => s.characteristics.id === id);
    if (!server)
        throw new Error('Could not find that server.');
    return server;
}
export async function getHackableServers(ns) {
    return (await getServerMap(ns)).servers.filter(server => ServerUtils.isHackableServer(server));
}
export async function getCurrentTargets(ns) {
    return (await getHackableServers(ns))
        .filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETING);
}
export async function getTargetServers(ns) {
    return (await getHackableServers(ns))
        .filter(server => server.isHackable(ns))
        .filter(server => server.isRooted(ns))
        .filter(server => server.staticHackingProperties.maxMoney > 0);
}
// We sort this descending
export async function getPreppingServers(ns) {
    return (await getServerMap(ns)).servers
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.PREP)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
// We sort this descending
export async function getHackingServers(ns) {
    return (await getServerMap(ns)).servers
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.HACK)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
// We sort this ascending
export async function getPurchasedServers(ns) {
    return (await getServerMap(ns)).servers
        .filter((server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}
export async function isServerMapInitialized(ns) {
    try {
        const currentServerMap = await readServerMap(ns);
        const lastAugTime = new Date(Date.now() - ns.getTimeSinceLastAug());
        // We have updated the server map file already, so we can stop now
        return (lastAugTime <= currentServerMap.lastUpdated);
    }
    catch (e) {
        return false;
    }
}
export async function initializeServerMap(ns) {
    const pid = ns.run('/src/runners/ServerMapRunner.js');
    // TODO: Change this so that it logs or something
    if (pid === 0)
        throw new Error('Cannot start the ServerMapRunner');
    // Wait until the server map runner has finished
    while (ns.isRunning(pid)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
    return;
}
