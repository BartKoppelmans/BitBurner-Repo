import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
import Sleeve from '/src/classes/Sleeve/Sleeve.js';
const LOOP_DELAY = 10000;
class SleeveManager {
    async initialize(ns) {
        Utils.disableLogging(ns);
        this.sleeves = Sleeve.getSleeves(ns);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the SleeveManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.debug(ns, `Stopping the SleeveManager`);
    }
    async managingLoop(ns) {
        for (const sleeve of this.sleeves) {
            SleeveManager.manageSleeve(ns, sleeve);
        }
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    static manageSleeve(ns, sleeve) {
        const information = sleeve.getInformation(ns);
        const stats = sleeve.getStats(ns);
        if (stats.shock > 0) {
            return sleeve.recoverShock(ns);
        }
        if (stats.sync < 100) {
            return sleeve.synchronize(ns);
        }
        return sleeve.commitCrime(ns, 'homicide');
    }
}
export async function start(ns) {
    if (isRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/SleeveManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isRunning(ns) {
    return ns.isRunning('/src/managers/SleeveManager.js', CONSTANT.HOME_SERVER_HOST);
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new SleeveManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
