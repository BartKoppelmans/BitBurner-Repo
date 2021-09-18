import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
// TODO: Move this all to the daemon
export var ControlFlowCode;
(function (ControlFlowCode) {
    ControlFlowCode["KILL_MANAGERS"] = "KILL_MANAGERS";
    ControlFlowCode["KILL_DAEMON"] = "KILL_DAEMON";
})(ControlFlowCode || (ControlFlowCode = {}));
export function hasDaemonKillRequest(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    if (requestPortHandle.empty())
        return false;
    // We only peek, as we want to be sure that we have a request for the daemon
    const request = requestPortHandle.peek().toString();
    if (request === ControlFlowCode.KILL_DAEMON) {
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
    // We only peek, as we want to be sure that we have a request for the daemon
    const request = requestPortHandle.peek().toString();
    return (request === ControlFlowCode.KILL_MANAGERS);
}
export function clearPorts(ns) {
    const ports = Array.from({ length: 20 }, (_, i) => i + 1);
    for (const port of ports) {
        ns.getPortHandle(port).clear();
    }
}
export function killDaemon(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    requestPortHandle.write(ControlFlowCode.KILL_DAEMON);
}
export function killAllManagers(ns) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.CONTROL_FLOW_PORT);
    requestPortHandle.write(ControlFlowCode.KILL_MANAGERS);
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
