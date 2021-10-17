import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { getPlayer } from '/src/util/PlayerUtils.js';
const LOOP_DELAY = 1000;
const HACKNET_ALLOWANCE = 0.25;
const PAYOFF_TIME = 3600; // Should pay off in an hour
class HackNetManager {
    managingLoopTimeout;
    static getTotalServerGainRate(ns, servers) {
        const player = getPlayer(ns);
        return servers.reduce((total, server) => total + server.getGainRate(ns, player), 0);
    }
    static getNewServerGainRate(ns) {
        const player = getPlayer(ns);
        return ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1, player.hacknet_node_money_mult);
    }
    static getBudget(ns) {
        return PlayerUtils.getMoney(ns) * HACKNET_ALLOWANCE;
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the HackNetManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.printTerminal(ns, `Stopping the HackNetManager`);
    }
    async managingLoop(ns) {
        // const hacknetServers: HacknetServer[] = ServerAPI.getHacknetServers(ns)
        // const oldGainRate: number = HackNetManager.getTotalServerGainRate(ns, hacknetServers)
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new HackNetManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
