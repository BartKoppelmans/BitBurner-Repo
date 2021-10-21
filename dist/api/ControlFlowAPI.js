import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { Managers } from '/src/managers/Managers.js';
export function killDaemon(ns) {
    ns.scriptKill('/src/scripts/daemon.js', CONSTANT.HOME_SERVER_HOST);
}
export function killAllManagers(ns) {
    for (const manager of Object.values(Managers)) {
        ns.scriptKill(manager, CONSTANT.HOME_SERVER_HOST);
    }
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
