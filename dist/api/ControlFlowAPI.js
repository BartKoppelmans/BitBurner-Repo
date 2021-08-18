import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
const MANAGER_KILL_DELAY = 5000;
export var ControlFlowCode;
(function (ControlFlowCode) {
    ControlFlowCode[ControlFlowCode["KILL_MANAGERS"] = 0] = "KILL_MANAGERS";
    ControlFlowCode[ControlFlowCode["KILL_DAEMON"] = 1] = "KILL_DAEMON";
})(ControlFlowCode || (ControlFlowCode = {}));
export async function launchRunners(ns) {
    const purchasedServerRunner = launchRunner(ns, '/src/runners/PurchasedServerRunner.js');
    const programRunner = launchRunner(ns, '/src/runners/ProgramRunner.js');
    const codingContractRunner = launchRunner(ns, '/src/runners/CodingContractRunner.js');
    await Promise.allSettled([purchasedServerRunner, programRunner, codingContractRunner]);
}
export async function launchRunner(ns, script) {
    // TODO: Check if we have enough ram available to run
    const pid = ns.run(script);
    while (ns.isRunning(pid)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function hasDaemonKillRequest(ns) {
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
export function hasManagerKillRequest(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty())
        return false;
    // We only peek, as we want to wait until daemon finishes first if that is a request
    const request = JSON.parse(requestPortHandle.peek().toString());
    return (request.code === ControlFlowCode.KILL_MANAGERS);
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
    requestPortHandle.write(JSON.stringify({
        code: ControlFlowCode.KILL_DAEMON,
        type: 'Request',
        id,
    }));
    // TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run
    while (isDaemonRunning(ns)) {
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
    requestPortHandle.write(JSON.stringify({
        code: ControlFlowCode.KILL_MANAGERS,
        type: 'Request',
        id,
    }));
    // TODO: We just add a delay and pray that it has finished by then
    await ns.sleep(MANAGER_KILL_DELAY);
}
export function killAllScripts(ns) {
    const serverMap = ServerAPI.getServerMap(ns);
    for (const server of serverMap.servers) {
        if (server.characteristics.host === CONSTANT.HOME_SERVER_HOST)
            continue;
        ns.killall(server.characteristics.host);
    }
    ns.killall(CONSTANT.HOME_SERVER_HOST);
}
function isDaemonRunning(ns) {
    return ns.isRunning('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST);
}
