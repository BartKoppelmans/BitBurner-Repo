import { ServerPurpose, ServerStatus, ServerType, } from '/src/classes/Server/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as SerializationUtils from '/src/util/SerializationUtils.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { PurchasedServer, } from '/src/classes/Server/PurchasedServer.js';
const MIN_NUMBER_PURPOSED_SERVERS = 2;
export function getServerMap(ns) {
    return readServerMap(ns);
}
function readServerMap(ns) {
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
export function clearServerMap(ns) {
    ns.clear(CONSTANT.SERVER_MAP_FILENAME);
}
export function getLastUpdated(ns) {
    return readServerMap(ns).lastUpdated;
}
export async function writeServerMap(ns, serverMap) {
    // NOTE: Do we want to do this?
    serverMap.lastUpdated = new Date();
    await ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w');
}
export async function updateServer(ns, server) {
    const serverMap = getServerMap(ns);
    const index = serverMap.servers.findIndex((s) => s.characteristics.host === server.characteristics.host);
    if (index === -1)
        throw new Error('Could not find the server.');
    serverMap.servers[index] = server;
    await writeServerMap(ns, serverMap);
}
export async function setPurpose(ns, host, purpose, force = false) {
    const server = getServerByName(ns, host);
    if (ServerUtils.isPurchasedServer(server) && server.quarantinedInformation.quarantined) {
        if (server.quarantinedInformation.originalPurpose === purpose)
            return;
    }
    else if (server.purpose === purpose)
        return;
    if (ServerUtils.isPurchasedServer(server) && !force) {
        if (server.quarantinedInformation.quarantined) {
            server.quarantinedInformation.originalPurpose = purpose;
        }
        else
            server.purpose = purpose;
    }
    else
        server.purpose = purpose;
    await updateServer(ns, server);
}
export async function setStatus(ns, host, status) {
    const server = getServerByName(ns, host);
    if (!ServerUtils.isHackableServer(server))
        throw new Error('The server is not a hackable server');
    if (server.status === status)
        return;
    server.status = status;
    await updateServer(ns, server);
}
export async function addServer(ns, server) {
    const serverMap = getServerMap(ns);
    const serverAlreadyExists = serverMap.servers.some((s) => s.characteristics.host === server.characteristics.host);
    if (serverAlreadyExists)
        throw new Error('Cannot add a server that already exists in the list');
    serverMap.servers.push(server);
    await writeServerMap(ns, serverMap);
}
export function getServerUtilization(ns, servers, serverPurpose) {
    if (servers.length === 0)
        throw new Error('No servers yet?');
    if (serverPurpose)
        servers = servers.filter((server) => server.purpose === serverPurpose);
    if (servers.length <= MIN_NUMBER_PURPOSED_SERVERS)
        return Infinity;
    const utilized = servers.reduce((subtotal, server) => subtotal + server.getUsedRam(ns), 0);
    const total = servers.reduce((subtotal, server) => subtotal + server.getTotalRam(ns), 0);
    return (utilized / total);
}
export async function quarantine(ns, host, ram) {
    const server = getServerByName(ns, host);
    if (!ServerUtils.isPurchasedServer(server))
        throw new Error('Cannot quarantine a normal server');
    server.quarantinedInformation = { quarantined: true, ram, originalPurpose: server.purpose };
    server.purpose = ServerPurpose.NONE;
    await updateServer(ns, server);
    LogAPI.printTerminal(ns, `We put ${server.characteristics.host} into quarantine`);
}
export async function upgradeServer(ns, host, ram) {
    const server = getServerByName(ns, host);
    if (!ServerUtils.isPurchasedServer(server))
        throw new Error('Cannot quarantine a normal server');
    // TODO: Do some checks here
    if (!server.canUpgrade(ns, ram))
        throw new Error('Cannot upgrade the server.');
    // TODO: Perhaps we should check here again how much we can actually purchase
    const deletedServer = ns.deleteServer(host);
    if (!deletedServer)
        throw new Error(`Could not delete server ${host}`);
    const boughtServer = ns.purchaseServer(host, ram);
    if (boughtServer) {
        LogAPI.printTerminal(ns, `Upgraded server ${boughtServer} with ${ram}GB ram.`);
    }
    else
        throw new Error('Could not purchase the server again.');
    server.purpose = PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId);
    server.quarantinedInformation = { quarantined: false };
    await updateServer(ns, server);
}
export async function increaseReservation(ns, host, reservation) {
    const server = getServerByName(ns, host);
    reservation = Math.round(reservation * 100) / 100;
    server.increaseReservation(ns, reservation);
    await updateServer(ns, server);
}
export async function decreaseReservations(ns, ramSpread, serverMap = getServerMap(ns)) {
    for (const [host, ram] of ramSpread) {
        const serverIndex = serverMap.servers.findIndex((server) => server.characteristics.host === host);
        if (serverIndex === -1)
            throw new Error('We could not find the server in the server map');
        const reservation = Math.round(ram * 100) / 100;
        serverMap.servers[serverIndex].decreaseReservation(ns, reservation);
    }
    await writeServerMap(ns, serverMap);
}
export function getServer(ns, id) {
    const server = getServerMap(ns).servers.find(s => s.characteristics.id === id);
    if (!server)
        throw new Error('Could not find that server.');
    return server;
}
export function getServerByName(ns, host, serverMap = getServerMap(ns)) {
    const server = serverMap.servers.find(s => s.characteristics.host === host);
    if (!server)
        throw new Error('Could not find that server.');
    return server;
}
export function getHackableServers(ns) {
    return getServerMap(ns).servers.filter(server => ServerUtils.isHackableServer(server));
}
export function getCurrentTargets(ns) {
    return getHackableServers(ns)
        .filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETING);
}
export function getTargetServers(ns) {
    return getHackableServers(ns)
        .filter(server => server.isHackable(ns))
        .filter(server => server.isRooted(ns))
        .filter(server => server.staticHackingProperties.maxMoney > 0);
}
// We sort this descending
export function getPreppingServers(ns) {
    return getServerMap(ns).servers
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.PREP)
        .filter((server) => server.purpose === ServerPurpose.PREP)
        .sort((a, b) => {
        if (a.characteristics.type === ServerType.HacknetServer && b.characteristics.type === ServerType.HacknetServer)
            return b.getAvailableRam(ns) - a.getAvailableRam(ns);
        else if (a.characteristics.type === ServerType.HacknetServer)
            return 1;
        else if (b.characteristics.type === ServerType.HacknetServer)
            return -1;
        else
            return b.getAvailableRam(ns) - a.getAvailableRam(ns);
    });
}
// We sort this descending
export function getHackingServers(ns) {
    return getServerMap(ns).servers
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.HACK)
        .sort((a, b) => {
        if (a.characteristics.type === ServerType.HacknetServer && b.characteristics.type === ServerType.HacknetServer)
            return b.getAvailableRam(ns) - a.getAvailableRam(ns);
        else if (a.characteristics.type === ServerType.HacknetServer)
            return 1;
        else if (b.characteristics.type === ServerType.HacknetServer)
            return -1;
        else
            return b.getAvailableRam(ns) - a.getAvailableRam(ns);
    });
}
export async function moveServerPurpose(ns, purpose, type) {
    const otherPurpose = (purpose === ServerPurpose.HACK) ? ServerPurpose.PREP : ServerPurpose.HACK;
    let servers;
    if (type === ServerType.HacknetServer) {
        servers = getHacknetServers(ns, 'alphabetic');
    }
    else if (type === ServerType.PurchasedServer) {
        servers = getPurchasedServers(ns, 'alphabetic');
    }
    else
        throw new Error(`Type ${type} not yet supported.`);
    const numPrepServers = servers.filter((server) => server.hasPurpose(ServerPurpose.PREP)).length;
    const numHackServers = servers.filter((server) => server.hasPurpose(ServerPurpose.HACK)).length;
    const numServers = servers.length;
    if (purpose === ServerPurpose.PREP && numServers - numHackServers <= MIN_NUMBER_PURPOSED_SERVERS)
        return;
    else if (purpose === ServerPurpose.HACK && numServers - numPrepServers <= MIN_NUMBER_PURPOSED_SERVERS)
        return;
    const movedServer = servers.find((server) => server.hasPurpose(otherPurpose));
    if (!movedServer)
        return;
    await setPurpose(ns, movedServer.characteristics.host, purpose);
    LogAPI.printLog(ns, `Changed server ${movedServer.characteristics.host} to ${purpose}`);
}
// We sort this ascending
export function getPurchasedServers(ns, sortBy = 'ram') {
    const purchasedServers = getServerMap(ns).servers
        .filter((server) => ServerUtils.isPurchasedServer(server));
    if (sortBy === 'alphabetic')
        return purchasedServers.sort((a, b) => a.characteristics.purchasedServerId - b.characteristics.purchasedServerId);
    else if (sortBy === 'ram')
        return purchasedServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    else
        throw new Error('Unknown sorting order');
}
// We sort this ascending
export function getHacknetServers(ns, sortBy = 'ram') {
    const hacknetServers = getServerMap(ns).servers
        .filter((server) => ServerUtils.isHacknetServer(server));
    if (sortBy === 'alphabetic')
        return hacknetServers.sort((a, b) => a.characteristics.hacknetServerId - b.characteristics.hacknetServerId);
    else if (sortBy === 'ram')
        return hacknetServers.sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    else
        throw new Error('Unknown sorting order');
}
export function isServerMapInitialized(ns) {
    try {
        const currentServerMap = readServerMap(ns);
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
