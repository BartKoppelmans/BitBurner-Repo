import type { BitBurner as NS } from "Bitburner";
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import Server from '/src/classes/Server.js';
import * as ProgramManager from "/src/managers/ProgramManager.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";

export async function getServerMap(ns: NS): Promise<Server[]> {
    return ServerManagerUtils.readServerMap(ns);
}

export async function requestUpdate(ns: NS): Promise<void> {
    // TODO: Request the update and then wait until it is executed
}

export async function getServer(ns: NS, id: number): Promise<Server> {

    const server: Server | undefined = (await getServerMap(ns)).find(server => server.id === id);

    if (!server) throw new Error("Could not find that server.");

    return server;
}

export async function getTargetableServers(ns: NS): Promise<HackableServer[]> {
    let servers: HackableServer[] = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server)) as HackableServer[];

    servers = servers
        .filter(server => server.isHackable(ns))
        .filter(server => ProgramManager.isRooted(ns, server) || ProgramManager.canRoot(ns, server))
        .filter(server => server.staticHackingProperties.maxMoney > 0);

    return servers;
};

// We sort this descending
export async function getHackingServers(ns: NS): Promise<Server[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => ProgramManager.isRooted(ns, server))
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
};

// We sort this ascending
export async function getPurchasedServers(ns: NS): Promise<PurchasedServer[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}

export async function rootAllServers(ns: NS): Promise<void> {
    const serverMap: Server[] = await getServerMap(ns);

    // Root all servers 
    await Promise.all(serverMap.map(async (server) => {
        if (!ProgramManager.isRooted(ns, server) && ProgramManager.canRoot(ns, server)) {
            await ProgramManager.root(ns, server);
        }
    }));
};

export function startServerManager(ns: NS): void {
    ns.exec('/src/managers/ServerManager.js', ns.getHostname());
}

export function isServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/ServerManager.js', ns.getHostname());
}