import * as CodingContractAPI from "/src/api/CodingContractAPI.js";
import * as JobAPI from "/src/api/JobAPI.js";
import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as PurchasedServerAPI from "/src/api/PurchasedServerAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { ControlFlowCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";
export async function hasDaemonKillRequest(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty())
        return false;
    // We only peek, as we want to be sure that we have a request for the daemon
    const request = JSON.parse(requestPortHandle.peek().toString());
    if (request.code === ControlFlowCode.KILL_DAEMON) {
        // Remove the request from the queue
        requestPortHandle.read();
        return true;
    }
    else
        return false;
}
export async function hasManagerKillRequest(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty())
        return false;
    // We only peek, as we want to wait until daemon finishes first if that is a request
    const request = JSON.parse(requestPortHandle.peek().toString());
    if (request.code === ControlFlowCode.KILL_MANAGERS)
        return true;
    else
        return false;
}
export function clearPorts(ns) {
    const ports = Array.from({ length: 20 }, (_, i) => i + 1);
    for (const port of ports) {
        ns.getPortHandle(port).clear();
    }
}
export async function killDaemon(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }
    const id = Utils.generateHash();
    let request = {
        code: ControlFlowCode.KILL_DAEMON,
        type: "Request",
        id
    };
    requestPortHandle.write(JSON.stringify(request));
    // TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run
    while (true) {
        if (!isDaemonRunning(ns))
            return;
        await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
    }
}
export async function killAllManagers(ns) {
    // TODO: Perhaps move this to each API individually? Then we also know which one failed.
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }
    const id = Utils.generateHash();
    let request = {
        code: ControlFlowCode.KILL_MANAGERS,
        type: "Request",
        id
    };
    requestPortHandle.write(JSON.stringify(request));
    // TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run
    while (true) {
        if (!areManagersRunning(ns))
            return;
        await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
    }
}
export async function killExternalServers(ns, serverMap) {
    await Promise.all(serverMap.map(async (server) => {
        if (server.characteristics.host !== CONSTANT.HOME_SERVER_HOST) {
            killServer(ns, server);
        }
    }));
}
async function killServer(ns, server) {
    if (ServerUtils.isHomeServer(server))
        return;
    let isRunningAnything = true;
    if (!isRunningAnything)
        return;
    ns.killall(server.characteristics.host);
    do {
        isRunningAnything = (ns.ps(server.characteristics.host).length > 0);
        await ns.sleep(CONSTANT.SMALL_DELAY);
    } while (isRunningAnything);
    return;
}
function areManagersRunning(ns) {
    return (JobAPI.isJobManagerRunning(ns) ||
        ProgramAPI.isProgramManagerRunning(ns) ||
        ServerAPI.isServerManagerRunning(ns) ||
        PurchasedServerAPI.isPurchasedServerManagerRunning(ns) ||
        CodingContractAPI.isCodingContractManagerRunning(ns));
}
function isDaemonRunning(ns) {
    return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST);
}
