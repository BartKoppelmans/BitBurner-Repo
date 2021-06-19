import { CONSTANT } from "/src/lib/constants.js";
export async function rootAllServers(ns) {
    // nope not yet
    return;
}
export async function startProgramManager(ns) {
    if (isProgramManagerRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/ProgramManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isProgramManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isProgramManagerRunning(ns) {
    return ns.isRunning('/src/managers/ProgramManager.js', CONSTANT.HOME_SERVER_HOST);
}
