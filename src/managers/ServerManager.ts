import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import Server from '/src/classes/Server.js';
import { ServerRequest, ServerResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";

class ServerManager {

    private serverMap: Server[] = [];
    private lastUpdated: Date = CONSTANT.EPOCH_DATE;

    private updateLoopInterval?: ReturnType<typeof setInterval>;
    private requestLoopInterval?: ReturnType<typeof setInterval>;

    public constructor() { }

    public async initialize(ns: NS): Promise<void> {
        Utils.disableLogging(ns);

        ServerManagerUtils.clearServerMap(ns);

        if (this.updateLoopInterval) {
            clearInterval(this.updateLoopInterval);
        }

        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
        }

        await this.updateServerMap(ns);
    }

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the ServerManager`, true, CONSTANT.COLOR_INFORMATION);

        this.updateLoopInterval = setInterval(this.updateServerMap.bind(this, ns), CONSTANT.SERVER_MAP_REBUILD_INTERVAL);
        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.SERVER_MESSAGE_INTERVAL);

        // TODO: Set the checker for reading the ports on whether an update is requested.

    }

    public async onDestroy(ns: NS): Promise<void> {
        ServerManagerUtils.clearServerMap(ns);

        if (this.updateLoopInterval) {
            clearInterval(this.updateLoopInterval);
        }

        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
        }

        Utils.tprintColored(`Stopping the ServerManager`, true, CONSTANT.COLOR_INFORMATION);
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
                type: "Response",
                request
            };
            responses.push(response);
        }

        await this.updateServerMap(ns);

        requestPortHandle.clear();

        for (const response of responses) {
            responsePortHandle.write(JSON.stringify(response));
        }
    }
}

export async function main(ns: NS) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }

    const instance: ServerManager = new ServerManager();

    await instance.initialize(ns);
    await instance.start(ns);

    // We just keep sleeping because we have to keep this script running
    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasManagerKillRequest(ns);

        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}