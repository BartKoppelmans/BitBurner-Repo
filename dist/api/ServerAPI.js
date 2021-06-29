import { ServerRequestCode } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerPurpose, ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";
export async function getServerMap(ns) {
    return ServerManagerUtils.readServerMap(ns);
}
export async function updatePurpose(ns, server, purpose) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }
    const id = Utils.generateHash();
    const request = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_PURPOSE,
        id,
        body: { server: server.characteristics.host, purpose }
    };
    requestPortHandle.write(JSON.stringify(request));
    const response = await getResponse(ns, id);
    return;
}
export async function updateStatus(ns, server, status) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }
    const id = Utils.generateHash();
    const request = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_STATUS,
        id,
        body: { server: server.characteristics.host, status }
    };
    requestPortHandle.write(JSON.stringify(request));
    const response = await getResponse(ns, id);
    return;
}
export async function requestUpdate(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }
    const id = Utils.generateHash();
    const request = {
        type: "Request",
        code: ServerRequestCode.UPDATE_SERVER_MAP,
        id
    };
    requestPortHandle.write(JSON.stringify(request));
    const response = await getResponse(ns, id);
    return;
}
async function getResponse(ns, id) {
    const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
    while (true) {
        const index = responsePortHandle.data.findIndex((resString) => {
            const res = JSON.parse(resString.toString());
            return (res.request.id === id);
        });
        if (index === -1)
            await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
    }
}
export async function getServer(ns, id) {
    const server = (await getServerMap(ns)).find(server => server.characteristics.id === id);
    if (!server)
        throw new Error("Could not find that server.");
    return server;
}
export async function getCurrentTargets(ns) {
    let servers = (await getServerMap(ns))
        .filter(server => ServerUtils.isHackableServer(server));
    servers = servers
        .filter(server => server.status === ServerStatus.PREPPING || server.status === ServerStatus.TARGETTING);
    return servers;
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
export async function getPreppingServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.PREP)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
;
// We sort this descending
export async function getHackingServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => server.isRooted(ns))
        .filter((server) => server.purpose === ServerPurpose.HACK)
        .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
}
;
// We sort this ascending
export async function getPurchasedServers(ns) {
    return (await getServerMap(ns))
        .filter((server) => ServerUtils.isPurchasedServer(server))
        .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
}
export async function startServerManager(ns) {
    if (isServerManagerRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/ServerManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isServerManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
    // NOTE: This is out of the ordinary, but it is important to update before continuing
    await requestUpdate(ns);
}
export function isServerManagerRunning(ns) {
    return ns.isRunning('/src/managers/ServerManager.js', CONSTANT.HOME_SERVER_HOST);
}
