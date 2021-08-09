import { CONSTANT } from '/src/lib/constants.js';
export async function startCodingContractManager(ns) {
    if (isCodingContractManagerRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/runners/CodingContractManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isCodingContractManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isCodingContractManagerRunning(ns) {
    return ns.isRunning('/src/runners/CodingContractManager.js', CONSTANT.HOME_SERVER_HOST);
}
