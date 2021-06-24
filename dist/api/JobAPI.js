import { JobMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
export async function communicateJob(ns, job) {
    const ports = [...CONSTANT.JOB_PORT_NUMBERS];
    const id = Utils.generateHash();
    const request = {
        type: "Request",
        code: JobMessageCode.NEW_JOB,
        body: JSON.stringify(job),
        id
    };
    let isSuccessful = false;
    for (const port of ports) {
        const portHandle = ns.getPortHandle(port);
        if (portHandle.full())
            continue;
        isSuccessful = portHandle.tryWrite(JSON.stringify(request));
        if (isSuccessful)
            break;
    }
    if (!isSuccessful) {
        Utils.tprintColored(`The ports are full and we could not write more, trying again in ${CONSTANT.PORT_FULL_RETRY_TIME}ms`, true, CONSTANT.COLOR_WARNING);
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
        return communicateJob(ns, job);
    }
    else {
        const response = await getResponse(ns, id);
        return;
    }
}
async function getResponse(ns, id) {
    const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_RESPONSE_PORT);
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
