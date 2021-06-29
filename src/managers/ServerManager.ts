import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import Server from '/src/classes/Server.js';
import { ServerPurposeRequest, ServerRequest, ServerRequestCode, ServerResponse, ServerStatusRequest } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerPurpose, ServerStatus, ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
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

        this.serverMap = ServerManagerUtils.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);
        this.lastUpdated = new Date();
        await this.determinePurposes(ns);
        this.onUpdate(ns);
    }

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the ServerManager`, true, CONSTANT.COLOR_INFORMATION);

        this.updateLoopInterval = setInterval(this.updateServerMap.bind(this, ns), CONSTANT.SERVER_MAP_REBUILD_INTERVAL);
        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.SERVER_MESSAGE_INTERVAL);

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

        const requests: ServerRequest[] = requestPortHandle.data.map((string) => JSON.parse(string.toString()));

        // NOTE: This could go wrong
        requestPortHandle.clear();

        const serverMapRequests: ServerRequest[] = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_MAP);
        const serverStatusRequests: ServerStatusRequest[] = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_STATUS) as ServerStatusRequest[];
        const serverPurposeRequests: ServerPurposeRequest[] = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_PURPOSE) as ServerPurposeRequest[];

        if (serverMapRequests.length > 0) {
            await this.onServerMapUpdateRequested(ns, serverMapRequests);
        }

        for (const request of serverStatusRequests) {
            await this.onServerStatusUpdateRequested(ns, request);
        }

        for (const request of serverPurposeRequests) {
            await this.onServerPurposeUpdateRequested(ns, request);
        }
    }

    private async onServerMapUpdateRequested(ns: NS, requests: ServerRequest[]) {

        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

        let responses: ServerResponse[] = [];

        for (const request of requests) {
            const response: ServerResponse = {
                type: "Response",
                request
            };
            responses.push(response);
        }

        await this.updateServerMap(ns);

        for (const response of responses) {
            responsePortHandle.write(JSON.stringify(response));
        }

    }

    private async onServerStatusUpdateRequested(ns: NS, request: ServerStatusRequest) {

        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

        const response: ServerResponse = {
            type: "Response",
            request
        };

        const server: Server | undefined = this.serverMap.find((server) => server.characteristics.host === request.body.server);

        if (!server) throw new Error("Could not find the server");
        if (server.characteristics.type === ServerType.HackableServer) {
            const hackableServer: HackableServer = server as HackableServer;

            if (request.body.status !== ServerStatus.NONE && hackableServer.status !== ServerStatus.NONE) {
                Utils.tprintColored(`Server ${hackableServer.characteristics.host} was already being prepped or targeted.`, false, CONSTANT.COLOR_WARNING);
            }

            hackableServer.setStatus(request.body.status);
        } else throw new Error("We kind of expected this to be a hackable server");


        await this.updateServerMap(ns);

        responsePortHandle.write(JSON.stringify(response));
    }

    private async onServerPurposeUpdateRequested(ns: NS, request: ServerPurposeRequest) {

        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);

        const response: ServerResponse = {
            type: "Response",
            request
        };

        const server: Server | undefined = this.serverMap.find((server) => server.characteristics.host === request.body.server);

        if (!server) throw new Error("Could not find the server");

        server.setPurpose(request.body.purpose);

        await this.updateServerMap(ns);

        responsePortHandle.write(JSON.stringify(response));
    }

    private async updateServerMap(ns: NS): Promise<void> {
        let tempServerMap: Server[] = ServerManagerUtils.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);

        // Copy the states of the old server map
        for (const oldServer of this.serverMap) {
            const newServer: Server | undefined = tempServerMap.find((s) => s.characteristics.host === oldServer.characteristics.host);

            if (!newServer) throw new Error("The server has disappeared.");

            newServer.setPurpose(oldServer.purpose);

            if (ServerUtils.isHackableServer(oldServer)) {
                (newServer as HackableServer).setStatus((oldServer as HackableServer).status);
            }
        }

        this.serverMap = tempServerMap;
        this.lastUpdated = new Date();

        this.onUpdate(ns);
    }

    private onUpdate(ns: NS): void {
        ServerManagerUtils.writeServerMap(ns, this.serverMap, this.lastUpdated);
    }

    private async determinePurposes(ns: NS): Promise<void> {
        this.serverMap
            .filter((server) => ServerUtils.isHackableServer(server))
            .forEach((server) => server.setPurpose(ServerPurpose.PREP));

        const home: Server | undefined = this.serverMap.find((server) => ServerUtils.isHomeServer(server));

        if (home) home.setPurpose(ServerPurpose.HACK);

        // The prepping servers
        const b: Server[] = this.serverMap
            .filter((server) => ServerUtils.isPurchasedServer(server))
            .sort((a, b) => a.characteristics.host.localeCompare(b.characteristics.host, 'en', { numeric: true }));

        // The hacking servers
        const a: Server[] = b.splice(0, CONSTANT.NUM_PURCHASED_HACKING_SERVERS);

        a.forEach((server) => server.setPurpose(ServerPurpose.HACK));
        b.forEach((server) => server.setPurpose(ServerPurpose.PREP));
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