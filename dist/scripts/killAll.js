import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import { ServerManager } from "/src/managers/ServerManager.js";
import ServerUtils from "/src/util/ServerUtils.js";
export async function main(ns) {
    const serverManager = ServerManager.getInstance(ns);
    const home = HomeServer.getInstance(ns);
    let serverMap = await serverManager.getServerMap(ns);
    await Promise.all(serverMap.map(async (server) => {
        killServer(ns, server);
    }));
    ns.killall(home.host);
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
        ns.sleep(CONSTANT.SMALL_DELAY);
    } while (isRunningAnything);
    return;
}
