import type { BitBurner as NS, Port, PortHandle } from "Bitburner";
import Job from "/src/classes/Job.js";
import { JobMessageCode, JobMessageRequest, JobMessageResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";

export async function communicateJob(ns: NS, job: Job): Promise<void> {
    const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];

    const id: string = Utils.generateHash();
    const request: JobMessageRequest = {
        type: "Request",
        code: JobMessageCode.NEW_JOB,
        body: JSON.stringify(job),
        id
    };

    let isSuccessful: boolean = false;
    for (const port of ports) {
        const portHandle: PortHandle = ns.getPortHandle(port);

        if (portHandle.full()) continue;

        isSuccessful = portHandle.tryWrite(JSON.stringify(request));

        if (isSuccessful) break;
    }

    if (!isSuccessful) {
        Utils.tprintColored(`The ports are full and we could not write more, trying again in ${CONSTANT.PORT_FULL_RETRY_TIME}ms`, true, CONSTANT.COLOR_WARNING);
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
        return communicateJob(ns, job);
    } else {
        const response: JobMessageResponse = await getResponse(ns, id);
        return;
    }
}

async function getResponse(ns: NS, id: string): Promise<JobMessageResponse> {
    const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_RESPONSE_PORT);

    while (true) {
        const index: number = responsePortHandle.data.findIndex((resString: string | number) => {
            const res: JobMessageResponse = JSON.parse(resString.toString());

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