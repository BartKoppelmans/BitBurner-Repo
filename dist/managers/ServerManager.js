import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as LogAPI from "/src/api/LogAPI.js";
import { LogMessageCode, ServerRequestCode } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerPurpose, ServerStatus, ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";
class ServerManager {
    constructor() {
        this.serverMap = [];
        this.lastUpdated = CONSTANT.EPOCH_DATE;
    }
    async initialize(ns) {
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
    async start(ns) {
        await LogAPI.log(ns, `Starting the ServerManager`, true, LogMessageCode.INFORMATION);
        this.updateLoopInterval = setInterval(this.updateServerMap.bind(this, ns), CONSTANT.SERVER_MAP_REBUILD_INTERVAL);
        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.SERVER_MESSAGE_INTERVAL);
    }
    async onDestroy(ns) {
        ServerManagerUtils.clearServerMap(ns);
        if (this.updateLoopInterval) {
            clearInterval(this.updateLoopInterval);
        }
        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
        }
        await LogAPI.log(ns, `Stopping the ServerManager`, true, LogMessageCode.INFORMATION);
    }
    async requestLoop(ns) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty())
            return;
        const requests = requestPortHandle.data.map((string) => JSON.parse(string.toString()));
        // NOTE: This could go wrong
        requestPortHandle.clear();
        const serverMapRequests = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_MAP);
        const serverStatusRequests = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_STATUS);
        const serverPurposeRequests = requests.filter((request) => request.code === ServerRequestCode.UPDATE_SERVER_PURPOSE);
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
    async onServerMapUpdateRequested(ns, requests) {
        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
        let responses = [];
        for (const request of requests) {
            const response = {
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
    async onServerStatusUpdateRequested(ns, request) {
        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
        const response = {
            type: "Response",
            request
        };
        const server = this.serverMap.find((server) => server.characteristics.host === request.body.server);
        if (!server)
            throw new Error("Could not find the server");
        if (server.characteristics.type === ServerType.HackableServer) {
            const hackableServer = server;
            if (request.body.status !== ServerStatus.NONE && hackableServer.status !== ServerStatus.NONE) {
                await LogAPI.log(ns, `Server ${hackableServer.characteristics.host} was already being prepped or targeted.`, false, LogMessageCode.WARNING);
            }
            hackableServer.setStatus(request.body.status);
        }
        else
            throw new Error("We kind of expected this to be a hackable server");
        await this.updateServerMap(ns);
        responsePortHandle.write(JSON.stringify(response));
    }
    async onServerPurposeUpdateRequested(ns, request) {
        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
        const response = {
            type: "Response",
            request
        };
        const server = this.serverMap.find((server) => server.characteristics.host === request.body.server);
        if (!server)
            throw new Error("Could not find the server");
        server.setPurpose(request.body.purpose);
        await this.updateServerMap(ns);
        responsePortHandle.write(JSON.stringify(response));
    }
    async updateServerMap(ns) {
        let tempServerMap = ServerManagerUtils.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);
        // Copy the states of the old server map
        for (const oldServer of this.serverMap) {
            const newServer = tempServerMap.find((s) => s.characteristics.host === oldServer.characteristics.host);
            if (!newServer)
                throw new Error("The server has disappeared.");
            newServer.setPurpose(oldServer.purpose);
            if (ServerUtils.isHackableServer(oldServer)) {
                newServer.setStatus(oldServer.status);
            }
        }
        this.serverMap = tempServerMap;
        this.lastUpdated = new Date();
        this.onUpdate(ns);
    }
    onUpdate(ns) {
        ServerManagerUtils.writeServerMap(ns, this.serverMap, this.lastUpdated);
    }
    async determinePurposes(ns) {
        this.serverMap
            .filter((server) => ServerUtils.isHackableServer(server))
            .forEach((server) => server.setPurpose(ServerPurpose.PREP));
        const home = this.serverMap.find((server) => ServerUtils.isHomeServer(server));
        if (home)
            home.setPurpose(ServerPurpose.HACK);
        // The prepping servers
        const b = this.serverMap
            .filter((server) => ServerUtils.isPurchasedServer(server))
            .sort((a, b) => a.characteristics.host.localeCompare(b.characteristics.host, 'en', { numeric: true }));
        // The hacking servers
        const a = b.splice(0, CONSTANT.NUM_PURCHASED_HACKING_SERVERS);
        a.forEach((server) => server.setPurpose(ServerPurpose.HACK));
        b.forEach((server) => server.setPurpose(ServerPurpose.PREP));
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new ServerManager();
    await instance.initialize(ns);
    await instance.start(ns);
    // We just keep sleeping because we have to keep this script running
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
