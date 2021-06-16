import { ServerResponseCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
class ServerManager {
    constructor(ns) {
        this.serverMap = [];
        this.lastUpdated = CONSTANT.EPOCH_DATE;
    }
    async initialize(ns) {
        ServerManagerUtils.clearServerMap(ns);
        await this.updateServerMap(ns);
    }
    async start(ns) {
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
    async requestLoop(ns) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty())
            return;
        await this.onUpdateRequested(ns);
    }
    async updateServerMap(ns) {
        let serverMap = ServerManagerUtils.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);
        this.serverMap = serverMap;
        this.lastUpdated = new Date();
        this.onUpdate(ns);
    }
    onUpdate(ns) {
        ServerManagerUtils.writeServerMap(ns, this.serverMap, this.lastUpdated);
    }
    async onUpdateRequested(ns) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_REQUEST_PORT);
        const responsePortHandle = ns.getPortHandle(CONSTANT.SERVER_MANAGER_RESPONSE_PORT);
        let responses = [];
        for (const requestString of requestPortHandle.data) {
            const request = JSON.parse(requestString.toString());
            const response = {
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
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
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
