import type { BitBurner as NS } from "Bitburner";
import { LogMessageCode, LogMessageRequest } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";

export async function log(ns: NS, message: string, printDate: boolean, logMessageCode: LogMessageCode) {

    if (!CONSTANT.LOGGING_ENABLED) return;

    const requestPortHandle = ns.getPortHandle(CONSTANT.LOG_MANAGER_REQUEST_PORT);

    while (requestPortHandle.full()) {
        await ns.sleep(CONSTANT.PORT_FULL_RETRY_TIME);
    }

    const id: string = Utils.generateHash();

    const request: LogMessageRequest = {
        type: "Request",
        code: logMessageCode,
        id,
        body: { message, printDate }
    };

    requestPortHandle.write(JSON.stringify(request));

    return;
}

export async function startLogManager(ns: NS): Promise<void> {
    if (isLogManagerRunning(ns)) return;

    // TODO: Check whether there is enough ram available

    ns.exec('/src/managers/LogManager.js', CONSTANT.HOME_SERVER_HOST);

    while (!isLogManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}

export function isLogManagerRunning(ns: NS): boolean {
    return ns.isRunning('/src/managers/LogManager.js', CONSTANT.HOME_SERVER_HOST);
}