import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
const LOOP_DELAY = 1000;
class CorporationManager {
    managingLoopTimeout;
    static async createCorporation(ns) {
        // TODO: Not possible yet
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
        await CorporationManager.createCorporation(ns);
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the CorporationManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.printTerminal(ns, `Stopping the CorporationManager`);
    }
    async managingLoop(ns) {
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new CorporationManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
