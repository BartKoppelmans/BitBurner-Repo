import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
const LOOP_DELAY = 1000;
class CorporationManager {
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
    }
    async destroy(ns) {
        LogAPI.printTerminal(ns, `Stopping the CorporationManager`);
    }
    async managingLoop(ns) {
        return;
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
        await instance.managingLoop(ns);
        await ns.sleep(LOOP_DELAY);
    }
}
