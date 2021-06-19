import * as ServerAPI from "/src/api/ServerAPI.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export async function main(ns) {
    let serverMap = await ServerAPI.getServerMap(ns);
    await Promise.all(serverMap.map(async (server) => {
        killServer(ns, server);
    }));
    ns.killall(CONSTANT.HOME_SERVER_HOST);
}
async function killServer(ns, server) {
    if (ServerUtils.isHomeServer(server))
        return;
    let isRunningAnything = true;
    if (!isRunningAnything)
        return;
    ns.killall(server.host);
    do {
        isRunningAnything = (ns.ps(server.host).length > 0);
        await ns.sleep(CONSTANT.SMALL_DELAY);
    } while (isRunningAnything);
    return;
}
