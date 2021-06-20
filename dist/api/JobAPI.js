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
    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
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
    // TODO: Make sure that there is a way to stop this, time-based doesn't work in the long run
    while (true) {
        const index = responsePortHandle.data.findIndex((resString) => {
            const res = JSON.parse(resString.toString());
            return (res.request.id === id);
        });
        if (index === -1)
            await ns.sleep(CONSTANT.RESPONSE_RETRY_DELAY);
        else {
            return JSON.parse(responsePortHandle.data.splice(index, 1).toString());
        }
    }
}
export async function startJobManager(ns) {
    if (isJobManagerRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isJobManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isJobManagerRunning(ns) {
    return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
}
