import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import { JobActionRequest, JobActionResponse, JobRequest, JobRequestCode, JobTargetsResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";

export async function getCurrentTargets(ns: NS): Promise<string[]> {

    const requestId: string = await sendRequest(ns, JobRequestCode.CURRENT_TARGETS);
    const response: JobTargetsResponse = await getResponse(ns, requestId) as JobTargetsResponse;

    return response.body;
}

export async function isPrepping(ns: NS, server: HackableServer): Promise<boolean> {

    const requestId: string = await sendRequest(ns, JobRequestCode.IS_PREPPING, server);
    const response: JobActionResponse = await getResponse(ns, requestId) as JobActionResponse;

    return response.body;
}

export async function isTargetting(ns: NS, server: HackableServer): Promise<boolean> {

    const requestId: string = await sendRequest(ns, JobRequestCode.IS_TARGETTING, server);
    const response: JobActionResponse = await getResponse(ns, requestId) as JobActionResponse;

    return response.body;
}


// Returns the id of the request
async function sendRequest(ns: NS, requestCode: JobRequestCode, server?: HackableServer): Promise<string> {
    const requestPortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_REQUEST_PORT);

    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }

    const id: string = Utils.generateHash();
    let request: JobRequest | JobActionRequest;

    if (requestCode === JobRequestCode.IS_PREPPING || requestCode === JobRequestCode.IS_TARGETTING) {
        if (!server) {
            throw new Error("Please add the server");
        }

        request = {
            type: "Request",
            code: requestCode,
            id,
            body: server.host
        };
    } else {
        request = {
            type: "Request",
            code: requestCode,
            id
        };
    }

    requestPortHandle.write(JSON.stringify(request));

    return id;
}

async function getResponse(ns: NS, id: string): Promise<JobTargetsResponse | JobActionResponse> {
    const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);

    // TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run

    while (true) {
        const index: number = responsePortHandle.data.findIndex((resString: string | number) => {
            const res: JobTargetsResponse = JSON.parse(resString.toString());

            return (res.request.id === id);
        });

        if (index === -1) await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
    }
}

export async function startJobManager(ns: NS): Promise<void> {
    if (isJobManagerRunning(ns)) return;

    // TODO: Check whether there is enough ram available

    ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);

    while (!isJobManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isJobManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
}