import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
let intervals = [];
class ServerManager {
    constructor(ns) {
        this.serverMap = [];
        this.lastUpdated = CONSTANT.EPOCH_DATE;
    }
    async initialize(ns) {
        // TODO: Clear the current map
        this.serverMap = this.buildServerMap(ns);
    }
    async start(ns) {
        // TODO: Set the checker for reading the ports on whether an update is requested.
        // TODO: Set the interval for updating the server map.
    }
    buildServerMap(ns) {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }
        let serverMap = ServerManagerUtils.spider(ns, 0, hostName);
        this.serverMap = serverMap;
        this.lastUpdated = new Date();
        this.onUpdate(ns);
        return serverMap;
    }
    onUpdate(ns) {
        ServerManagerUtils.writeServerMap(ns, this.serverMap);
    }
    onUpdateRequested(ns) {
        this.serverMap = this.buildServerMap(ns);
    }
    needsUpdate(ns) {
        return (Date.now() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
    }
}
export async function main(ns) {
    const instance = new ServerManager(ns);
    await instance.initialize(ns);
    await instance.start(ns);
    // We just keep sleeping because we have to keep this script running
    while (true) {
        await ns.sleep(10 * 1000);
    }
    // TODO: Cancel all the intervals when the script is killed
    /*
    for (const interval of intervals) {
        clearInterval(interval);
    }
    */
}
