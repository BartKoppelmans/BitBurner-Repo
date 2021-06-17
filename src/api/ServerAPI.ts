import type { BitBurner as NS } from "Bitburner";
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import Server from '/src/classes/Server.js';
import { ServerRequest, ServerRequestCode, ServerResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";

export async function getServerMap(ns: NS): Promise<Server[]> {
    return ServerManagerUtils.readServerMap(ns);
}

export async function requestUpdate(ns: NS): Promise<void> {

    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);

    if (requestPortHandle.full()) {
        throw new Error("Too much server requests sent already.");
    }

    const id: string = Utils.generateHash();

    const request: ServerRequest = {
        type: "Request",
        code: ServerRequestCode.UPDATE,
        id
    };

    requestPortHandle.write(JSON.stringify(request));

    const response: ServerResponse = await getResponse(ns, id);

    return;
}

async function getResponse(ns: NS, id: string): Promise<ServerResponse> {
    const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

    let hasResponse: boolean = false;

    let iteration: number = 0;
    const maxIterations = CONSTANT.MAX_SERVER_MESSAGE_WAIT / CONSTANT.SERVER_MESSAGE_INTERVAL;

    while (!hasResponse || (iteration > maxIterations)) {
        const index: number = responsePortHandle.data.findIndex((resString: string | number) => {
            const res: ServerResponse = JSON.parse(resString.toString());

            return (res.request.id === id);
        });

        if (index === -1) await ns.sleep(CONSTANT.SERVER_MESSAGE_INTERVAL);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
        iteration++;
    }

    throw new Error("We have been waiting for too long.");
}

export async function getServer(ns: NS, id: number): Promise<Server> {

    const server: Server | undefined = (await getServerMap(ns)).find(server => server.id === id);

    if (!server) throw new Error("Could not find that server.");

    return server;
}

export async function getTargetServers(ns: NS): Promise<HackableServer[]> {
    let servers: HackableServer[] = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server)) as HackableServer[];

    servers = servers
        .filter(server => server.isHackable(ns))
        .filter(server => server.isRooted(ns))
        .filter(server => server.staticHackingProperties.maxMoney > 0);

    return servers;
};

// We sort this descending
export async function getHackingServers(ns: NS): Promise<Server[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => server.isRooted(ns))
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
};

// We sort this ascending
export async function getPurchasedServers(ns: NS): Promise<PurchasedServer[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => ServerUtils.isPurchasedServer(server))
        // TODO: Sort by name
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}

export async function startServerManager(ns: NS): Promise<void> {
    ns.exec('/src/managers/ServerManager.js', ns.getHostname());

    while (!isServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }

    // NOTE: This is out of the ordinary, but it is important to update before continuing
    await requestUpdate(ns);
}

export function isServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/ServerManager.js', ns.getHostname());
}