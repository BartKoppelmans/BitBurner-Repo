import type { BitBurner as NS } from "Bitburner";
import HackableServer from '/src/classes/HackableServer.js';
import Server from '/src/classes/Server.js';
import { ServerPurposeRequest, ServerRequest, ServerRequestCode, ServerResponse, ServerStatusRequest } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerPurpose, ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";

export async function getServerMap(ns: NS): Promise<Server[]> {
    return ServerManagerUtils.readServerMap(ns);
}

export async function updatePurpose(ns: NS, server: Server, purpose: ServerPurpose): Promise<void> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);

    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }

    const id: string = Utils.generateHash();

    const request: ServerPurposeRequest = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_PURPOSE,
        id,
        body: { server: server.characteristics.host, purpose }
    };

    requestPortHandle.write(JSON.stringify(request));

    const response: ServerResponse = await getResponse(ns, id);

    return;
}

export async function updateStatus(ns: NS, server: Server, status: ServerStatus): Promise<void> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);

    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }

    const id: string = Utils.generateHash();

    const request: ServerStatusRequest = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_STATUS,
        id,
        body: { server: server.characteristics.host, status }
    };

    requestPortHandle.write(JSON.stringify(request));

    const response: ServerResponse = await getResponse(ns, id);

    return;
}

export async function requestUpdate(ns: NS): Promise<void> {

    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);

    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }

    const id: string = Utils.generateHash();

    const request: ServerRequest = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_MAP,
        id
    };

    requestPortHandle.write(JSON.stringify(request));

    const response: ServerResponse = await getResponse(ns, id);

    return;
}

async function getResponse(ns: NS, id: string): Promise<ServerResponse> {
    const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

    while (true) {
        const index: number = responsePortHandle.data.findIndex((resString: string | number) => {
            const res: ServerResponse = JSON.parse(resString.toString());

            return (res.request.id === id);
        });

        if (index === -1) await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
    }
}

export async function getServer(ns: NS, id: number): Promise<Server> {

    const server: Server | undefined = (await getServerMap(ns)).find(server => server.characteristics.id === id);

    if (!server) throw new Error("Could not find that server.");

    return server;
}

export async function getCurrentTargets(ns: NS): Promise<HackableServer[]> {
    let servers: HackableServer[] = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server)) as HackableServer[];

    servers = servers
        .filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETTING);

    return servers;
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
export async function getPreppingServers(ns: NS): Promise<Server[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => server.isRooted(ns))
        .filter((server: Server) => server.purpose === ServerPurpose.PREP)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
};

// We sort this descending
export async function getHackingServers(ns: NS): Promise<Server[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => server.isRooted(ns))
        .filter((server: Server) => server.purpose === ServerPurpose.HACK)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
};

// We sort this ascending
export async function getPurchasedServers(ns: NS): Promise<Server[]> {
    return (await getServerMap(ns))
        .filter((server: Server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}

export async function startServerManager(ns: NS): Promise<void> {
    if (isServerManagerRunning(ns)) return;

    // TODO: Check whether there is enough ram available

    ns.exec('/src/managers/ServerManager.js', CONSTANT.HOME_SERVER_HOST);

    while (!isServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }

    // NOTE: This is out of the ordinary, but it is important to update before continuing
    await requestUpdate(ns);
}

export function isServerManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/ServerManager.js', CONSTANT.HOME_SERVER_HOST);
}