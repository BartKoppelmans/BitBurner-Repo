import { JobRequestCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
export async function getCurrentTargets(ns) {
    const requestId = await sendRequest(ns, JobRequestCode.CURRENT_TARGETS);
    const response = await getResponse(ns, requestId);
    return response.body;
}
export async function isPrepping(ns, server) {
    const requestId = await sendRequest(ns, JobRequestCode.IS_PREPPING, server);
    const response = await getResponse(ns, requestId);
    return response.body;
}
export async function isTargetting(ns, server) {
    const requestId = await sendRequest(ns, JobRequestCode.IS_TARGETTING, server);
    const response = await getResponse(ns, requestId);
    return response.body;
}
// Returns the id of the request
async function sendRequest(ns, requestCode, server) {
    const requestPortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_REQUEST_PORT);
    if (requestPortHandle.full()) {
        throw new Error("Too much job requests sent already.");
    }
    const id = Utils.generateHash();
    let request;
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
    }
    else {
        request = {
            type: "Request",
            code: requestCode,
            id
        };
    }
    requestPortHandle.write(JSON.stringify(request));
    return id;
}
async function getResponse(ns, id) {
    const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);
    let hasResponse = false;
    let iteration = 0;
    const maxIterations = CONSTANT.MAX_JOB_MESSAGE_WAIT / CONSTANT.JOB_REQUEST_LOOP_INTERVAL;
    while (!hasResponse || (iteration > maxIterations)) {
        const index = responsePortHandle.data.findIndex((resString) => {
            const res = JSON.parse(resString.toString());
            return (res.request.id === id);
        });
        if (index === -1)
            await ns.sleep(CONSTANT.JOB_REQUEST_LOOP_INTERVAL);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
        iteration++;
    }
    throw new Error("We have been waiting for too long.");
}
export async function startJobManager(ns) {
    if (isJobManagerRunning(ns))
        return;
    ns.exec('/src/managers/JobManager.js', ns.getHostname());
    while (!isJobManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isJobManagerRunning(ns) {
    return ns.isRunning('/src/managers/JobManager.js', ns.getHostname());
}
