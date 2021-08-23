import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
const MANAGING_LOOP_DELAY = 1000;
class GangManager {
    async initialize(ns) {
        Utils.disableLogging(ns);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the GangManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.debug(ns, `Stopping the GangManager`);
    }
    async managingLoop(ns) {
        // Do something
    }
}
export async function start(ns) {
    if (isRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isRunning(ns) {
    return ns.isRunning('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST);
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new GangManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
