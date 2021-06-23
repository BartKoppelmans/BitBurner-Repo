import { CONSTANT } from "/src/lib/constants.js";
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
