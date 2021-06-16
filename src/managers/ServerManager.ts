import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { ServerRequest, ServerResponse, ServerResponseCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";

class ServerManager {

    private serverMap: Server[] = [];
    private lastUpdated: Date = CONSTANT.EPOCH_DATE;

    private updateLoopInterval?: ReturnType<typeof setInterval>;
    private requestLoopInterval?: ReturnType<typeof setInterval>;

    public constructor(ns: NS) { }

    public async initialize(ns: NS): Promise<void> {
        ServerManagerUtils.clearServerMap(ns);

        await this.updateServerMap(ns);
    }

    public async start(ns: NS): Promise<void> {

        if (this.updateLoopInterval) {
            clearInterval(this.updateLoopInterval);
        }

        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
        }

        this.updateLoopInterval = setInterval(this.updateServerMap.bind(this, ns), CONSTANT.SERVER_MAP_REBUILD_INTERVAL);
        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.SERVER_MESSAGE_INTERVAL);

        // TODO: Set the checker for reading the ports on whether an update is requested.

    }

    private async requestLoop(ns: NS): Promise<void> {

        const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty()) return;

        await this.onUpdateRequested(ns);
    }

    private async updateServerMap(ns: NS): Promise<void> {
        let serverMap: Server[] = ServerManagerUtils.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);

        this.serverMap = serverMap;
        this.lastUpdated = new Date();

        this.onUpdate(ns);
    }

    private onUpdate(ns: NS): void {
        ServerManagerUtils.writeServerMap(ns, this.serverMap, this.lastUpdated);
    }

    private async onUpdateRequested(ns: NS) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

        let responses: ServerResponse[] = [];

        for (const requestString of requestPortHandle.data) {
            const request: ServerRequest = JSON.parse(requestString.toString());
            const response: ServerResponse = {
                code: ServerResponseCode.SUCCESSFUL,
                type: "Response",
                request
            };
            responses.push(response);
        }

        requestPortHandle.clear();

        await this.updateServerMap(ns);

        for (const response of responses) {
            responsePortHandle.write(JSON.stringify(response));
        }
    }
}

export async function main(ns: NS) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }

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