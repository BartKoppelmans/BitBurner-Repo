import type { BitBurner as NS } from "Bitburner";
import * as JobAPI from "/src/api/JobAPI.js";
import * as ProgramAPI from "/src/api/ProgramAPI.js";
import * as PurchasedServerAPI from "/src/api/PurchasedServerAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Server from "/src/classes/Server.js";
import { ControlFlowCode, ControlFlowRequest } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";

export async function hasDaemonKillRequest(ns: NS): Promise<boolean> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty()) return false;

    // We only peek, as we want to be sure that we have a request for the daemon
    const request: ControlFlowRequest = JSON.parse(requestPortHandle.peek().toString());

    if (request.code === ControlFlowCode.KILL_DAEMON) {

        // Remove the request from the queue
        requestPortHandle.read();

        return true;
    }
    else return false;
}

export async function hasManagerKillRequest(ns: NS): Promise<boolean> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty()) return false;

    // We only peek, as we want to wait until daemon finishes first if that is a request
    const request: ControlFlowRequest = JSON.parse(requestPortHandle.peek().toString());

    if (request.code === ControlFlowCode.KILL_MANAGERS) return true;
    else return false;
}

export function clearPort(ns: NS): void {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    requestPortHandle.clear();
}

export async function killDaemon(ns: NS): Promise<void> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);

    if (requestPortHandle.full()) {
        throw new Error("Too much control flow requests sent already.");
    }

    const id: string = Utils.generateHash();
    let request: ControlFlowRequest = {
        code: ControlFlowCode.KILL_DAEMON,
        type: "Request",
        id
    };

    requestPortHandle.write(JSON.stringify(request));

    let iteration: number = 0;
    const maxIterations = CONSTANT.MAX_CONTROL_FLOW_MESSAGE_WAIT / CONSTANT.CONTROL_FLOW_CHECK_INTERVAL;

    while (iteration <= maxIterations) {

        if (!isDaemonRunning(ns)) return;

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);

        iteration++;
    }

    throw new Error("We have been waiting for too long.");
}

export async function killAllManagers(ns: NS): Promise<void> {

    // TODO: Perhaps move this to each API individually? Then we also know which one failed.

    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);

    if (requestPortHandle.full()) {
        throw new Error("Too much control flow requests sent already.");
    }

    const id: string = Utils.generateHash();
    let request: ControlFlowRequest = {
        code: ControlFlowCode.KILL_MANAGERS,
        type: "Request",
        id
    };

    requestPortHandle.write(JSON.stringify(request));

    let iteration: number = 0;
    const maxIterations = CONSTANT.MAX_CONTROL_FLOW_MESSAGE_WAIT / CONSTANT.CONTROL_FLOW_CHECK_INTERVAL;

    while (iteration <= maxIterations) {

        if (!areManagersRunning(ns)) return;

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);

        iteration++;
    }

    throw new Error("We have been waiting for too long.");
}

export async function killExternalServers(ns: NS, serverMap: Server[]): Promise<void> {
    await Promise.all(serverMap.map(async (server) => {
        if (server.host !== CONSTANT.HOME_SERVER_HOST) {
            killServer(ns, server);
        }
    }));
}

async function killServer(ns: NS, server: Server): Promise<void> {
    if (ServerUtils.isHomeServer(server)) return;

    let isRunningAnything: boolean = true;

    if (!isRunningAnything) return;

    ns.killall(server.host);

    do {
        isRunningAnything = (ns.ps(server.host).length > 0);

        await ns.sleep(CONSTANT.SMALL_DELAY);
    } while (isRunningAnything);

    return;
}

function areManagersRunning(ns: NS): boolean {
    return (
        JobAPI.isJobManagerRunning(ns) ||
        ProgramAPI.isProgramManagerRunning(ns) ||
        ServerAPI.isServerManagerRunning(ns) ||
        PurchasedServerAPI.isPurchasedServerManagerRunning(ns)
    );
}

function isDaemonRunning(ns: NS): boolean {
    return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST);
}