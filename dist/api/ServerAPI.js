import { ServerRequestCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";
export async function getServerMap(ns) {
    return ServerManagerUtils.readServerMap(ns);
}
export async function requestUpdate(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
    if (requestPortHandle.full()) {
        throw new Error("Too much server requests sent already.");
    }
    const id = Utils.generateHash();
    const request = {
        type: "Request",
        code: ServerRequestCode.UPDATE,
        id
    };
    requestPortHandle.write(JSON.stringify(request));
    const response = await getResponse(ns, id);
    return;
}
async function getResponse(ns, id) {
    const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
    let hasResponse = false;
    let iteration = 0;
    const maxIterations = CONSTANT.MAX_SERVER_MESSAGE_WAIT / CONSTANT.SERVER_MESSAGE_INTERVAL;
    while (iteration < maxIterations) {
        const index = responsePortHandle.data.findIndex((resString) => {
            const res = JSON.parse(resString.toString());
            return (res.request.id === id);
        });
        if (index === -1)
            await ns.sleep(CONSTANT.SERVER_MESSAGE_INTERVAL);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
        iteration++;
    }
    throw new Error("We have been waiting for too long.");
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
        // TODO: Sort by name
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
