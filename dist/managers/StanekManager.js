import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
const LOOP_DELAY = 1000;
class StanekManager {
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the StanekManager`);
    }
    async destroy(ns) {
        LogAPI.printTerminal(ns, `Stopping the StanekManager`);
    }
    async managingLoop(ns) {
        const fragments = ns.stanek.activeFragments().sort((a, b) => a.numCharge - b.numCharge);
        const lowestCharged = fragments[0];
        await ns.stanek.charge(lowestCharged.x, lowestCharged.y);
        return;
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new StanekManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await instance.managingLoop(ns);
        await ns.asleep(LOOP_DELAY);
    }
}
