import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";

let intervals: ReturnType<typeof setInterval>[] = [];

class ServerManager {

    private serverMap: Server[] = [];
    private lastUpdated: Date = CONSTANT.EPOCH_DATE;

    public constructor(ns: NS) { }

    public async initialize(ns: NS): Promise<void> {
        // TODO: Clear the current map

        this.serverMap = this.buildServerMap(ns);
    }

    public async start(ns: NS): Promise<void> {

        // TODO: Set the checker for reading the ports on whether an update is requested.

        // TODO: Set the interval for updating the server map.
    }

    private buildServerMap(ns: NS): Server[] {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }

        let serverMap: Server[] = ServerManagerUtils.spider(ns, 0, hostName);

        this.serverMap = serverMap;
        this.lastUpdated = new Date();

        this.onUpdate(ns);

        return serverMap;
    }

    private onUpdate(ns: NS): void {
        ServerManagerUtils.writeServerMap(ns, this.serverMap);
    }

    private onUpdateRequested(ns: NS) {
        this.serverMap = this.buildServerMap(ns);
    }

    private needsUpdate(ns: NS): boolean {
        return (Date.now() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
    }
}

export async function main(ns: NS) {
    const instance: ServerManager = new ServerManager(ns);

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