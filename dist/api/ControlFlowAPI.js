import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
// TODO: Move this all to the daemon
export var ControlFlowCode;
(function (ControlFlowCode) {
    ControlFlowCode["KILL_MANAGERS"] = "KILL_MANAGERS";
    ControlFlowCode["KILL_DAEMON"] = "KILL_DAEMON";
})(ControlFlowCode || (ControlFlowCode = {}));
export function hasDaemonKillRequest(ns) {
    const portContents = ns.peek(CONSTANT.CONTROL_FLOW_PORT);
    if (portContents === 'NULL PORT DATA' || !portContents)
        return false;
    return (portContents.toString() === ControlFlowCode.KILL_DAEMON);
}
export function hasManagerKillRequest(ns) {
    const portContents = ns.peek(CONSTANT.CONTROL_FLOW_PORT);
    if (portContents === 'NULL PORT DATA' || !portContents)
        return false;
    return (portContents.toString() === ControlFlowCode.KILL_MANAGERS);
}
export function clearPorts(ns) {
    const ports = Array.from({ length: 20 }, (_, i) => i + 1);
    for (const port of ports) {
        ns.clear(port);
    }
}
export async function killDaemon(ns) {
    await ns.write(CONSTANT.CONTROL_FLOW_PORT, ControlFlowCode.KILL_DAEMON);
}
export async function killAllManagers(ns) {
    await ns.write(CONSTANT.CONTROL_FLOW_PORT, ControlFlowCode.KILL_MANAGERS);
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
